import { FormEvent, useEffect, useRef, useState } from 'react';
import { supabase } from './lib/supabase';
import { playSpeech, stopSpeech } from './lib/speechPlayer';

type Message = { role: 'user' | 'assistant'; content: string };
type TrainingRow = { id: string; content: string; category: string | null };
type ChatMode = 'text' | 'voice';

const VOICE_OPTIONS = [
  { id: 'Kore', label: '温柔女声' },
  { id: 'Aoede', label: '轻快女声' },
  { id: 'Leda', label: '年轻女声' },
  { id: 'Charon', label: '沉稳男声' },
  { id: 'Puck', label: '活泼男声' },
  { id: 'Fenrir', label: '磁性男声' },
];

export default function App() {
  const [sessionReady, setSessionReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [trainingData, setTrainingData] = useState<TrainingRow[]>([]);
  const [newTraining, setNewTraining] = useState('');
  const [notice, setNotice] = useState('');
  const [chatMode, setChatMode] = useState<ChatMode>('text');
  const chatModeRef = useRef<ChatMode>('text');
  const [voice, setVoice] = useState(() => {
    try { return localStorage.getItem('xinling-voice') || 'Kore'; }
    catch { return 'Kore'; }
  });
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelRecordingRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setSessionReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      setSessionReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }
    supabase.rpc('has_role', { _user_id: userId, _role: 'admin' }).then(({ data }) => {
      setIsAdmin(Boolean(data));
    });
  }, [userId]);

  async function handleAuth(e: FormEvent) {
    e.preventDefault();
    setNotice('');
    setBusy(true);
    const result = authMode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (result.error) setNotice(result.error.message);
    else if (authMode === 'signup') setNotice('Account created. Check your email if confirmation is enabled.');
  }


  useEffect(() => () => {
    stopSpeech();
    cancelRecordingRef.current = true;
    if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
  }, []);

  function switchMode(mode: ChatMode) {
    chatModeRef.current = mode;
    setChatMode(mode);
    stopSpeech();
    setIsSpeaking(false);
    if (mediaRecorderRef.current?.state === 'recording') {
      cancelRecordingRef.current = true;
      mediaRecorderRef.current.stop();
    }
  }

  function changeVoice(nextVoice: string) {
    setVoice(nextVoice);
    try { localStorage.setItem('xinling-voice', nextVoice); } catch { /* storage unavailable */ }
  }

  async function speakText(text: string) {
    if (!text.trim()) return;
    setIsSpeaking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('请重新登录');
      await playSpeech(
        import.meta.env.VITE_SUPABASE_URL + '/functions/v1/voice-speech',
        session.access_token,
        text.slice(0, 4000),
        voice
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '语音播放失败');
    } finally {
      setIsSpeaking(false);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    setIsRecording(false);
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setNotice('当前浏览器不支持录音，请使用支持麦克风的 HTTPS 浏览器');
      return;
    }
    stopSpeech();
    setIsSpeaking(false);
    setNotice('');
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ['audio/webm', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported(t));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      cancelRecordingRef.current = false;

      recorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream?.getTracks().forEach(track => track.stop());
        if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
        setIsRecording(false);
        if (cancelRecordingRef.current) return;
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 1024) {
          setNotice('录音太短，请再试一次');
          return;
        }
        if (blob.size > 20 * 1024 * 1024) {
          setNotice('录音文件过大，请缩短录音时间');
          return;
        }
        setIsTranscribing(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('请重新登录');
          const formData = new FormData();
          const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
          formData.append('file', blob, 'recording.' + extension);
          const response = await fetch(
            import.meta.env.VITE_SUPABASE_URL + '/functions/v1/voice-transcribe',
            { method: 'POST', headers: { Authorization: 'Bearer ' + session.access_token }, body: formData }
          );
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || '语音识别失败');
          if (typeof result.text !== 'string' || !result.text.trim()) throw new Error('没有识别到语音');
          const transcript = result.text.trim();
          if (chatModeRef.current === 'voice') {
            await sendMessage(transcript);
          } else {
            setInput(previous => (previous ? previous + ' ' : '') + transcript);
          }
        } catch (error) {
          setNotice(error instanceof Error ? error.message : '语音识别失败');
        } finally {
          setIsTranscribing(false);
        }
      };
      recorder.start();
      setIsRecording(true);
      recordingTimerRef.current = setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 90000);
    } catch (error) {
      stream?.getTracks().forEach(track => track.stop());
      setNotice(error instanceof Error ? '无法使用麦克风，请检查浏览器权限' : '无法开始录音');
      setIsRecording(false);
    }
  }

  async function sendMessage(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || busy) return;
    if (text.length > 5000) {
      setNotice('消息不能超过 5000 字符');
      return;
    }
    setInput('');
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setBusy(true);
    setNotice('');

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setBusy(false);
      setNotice('Please sign in again.');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-therapy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: next }),
      });
      if (!response.ok) throw new Error(await response.text());
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream.');
      const decoder = new TextDecoder();
      let buffer = '';
      let assistant = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload || payload === '[DONE]') continue;
          try {
            const json = JSON.parse(payload);
            const chunk = json.choices?.[0]?.delta?.content;
            if (chunk) {
              assistant += chunk;
              setMessages([...next, { role: 'assistant', content: assistant }]);
            }
          } catch {
            // Ignore incomplete streaming frames.
          }
        }
      }
      if (assistant.trim() && chatModeRef.current === 'voice') void speakText(assistant);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Chat request failed.');
    } finally {
      setBusy(false);
    }
  }

  async function loadTrainingData() {
    const { data, error } = await supabase.from('training_data').select('id, content, category').order('created_at', { ascending: false });
    if (error) setNotice(error.message);
    else setTrainingData(data ?? []);
  }

  async function addTrainingData() {
    if (!userId || !newTraining.trim()) return;
    const { error } = await supabase.from('training_data').insert({ content: newTraining.trim(), user_id: userId });
    if (error) setNotice(error.message);
    else {
      setNewTraining('');
      await loadTrainingData();
    }
  }

  async function deleteTrainingData(id: string) {
    const { error } = await supabase.from('training_data').delete().eq('id', id);
    if (error) setNotice(error.message);
    else await loadTrainingData();
  }

  if (!sessionReady) return <main className="shell"><p>Loading…</p></main>;

  if (!userId) {
    return (
      <main className="shell auth-shell">
        <section className="card auth-card">
          <div className="brand-mark">心</div>
          <h1>心灵树洞 · Xinling AI</h1>
          <p className="muted">A small AI-assisted wellbeing conversation demo.</p>
          <form onSubmit={handleAuth} className="stack">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required />
            <button disabled={busy}>{busy ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'}</button>
          </form>
          <button className="link-button" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
            {authMode === 'login' ? 'Need an account?' : 'Already have an account?'}
          </button>
          {notice && <p className="notice">{notice}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <strong>心灵树洞</strong>
          <span className="muted"> · Xinling AI</span>
        </div>
        <div className="actions">
          <nav className="mode-switch" aria-label="对话模式">
            <button type="button" className={chatMode === 'text' ? 'selected' : ''} onClick={() => switchMode('text')} aria-pressed={chatMode === 'text'}>文字</button>
            <button type="button" className={chatMode === 'voice' ? 'selected' : ''} onClick={() => switchMode('voice')} aria-pressed={chatMode === 'voice'}>语音</button>
          </nav>
          {isAdmin && <button className="secondary" onClick={async () => { setShowAdmin(!showAdmin); if (!showAdmin) await loadTrainingData(); }}>{showAdmin ? 'Chat' : 'Admin'}</button>}
          <button className="secondary" onClick={() => { stopSpeech(); void supabase.auth.signOut(); }}>Sign out</button>
        </div>
      </header>

      {showAdmin && isAdmin ? (
        <section className="content card admin-panel">
          <h2>Training data</h2>
          <div className="composer">
            <textarea value={newTraining} onChange={e => setNewTraining(e.target.value)} placeholder="Add project-specific training content…" />
            <button onClick={addTrainingData}>Add</button>
          </div>
          <div className="stack">
            {trainingData.map(row => (
              <article key={row.id} className="training-row">
                <p>{row.content}</p>
                <div className="row-footer"><span className="muted">{row.category ?? 'Uncategorised'}</span><button className="danger" onClick={() => deleteTrainingData(row.id)}>Delete</button></div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="chat-layout">
          <div className="messages">
            {messages.length === 0 && (
              <div className="empty-state card">
                <div className="brand-mark">心</div>
                <h2>欢迎来到心灵树洞</h2>
                <p className="muted">你可以在这里记录感受、梳理想法。此演示不提供医疗诊断或治疗。</p>
              </div>
            )}
            {messages.map((message, index) => (
              <article className={`message ${message.role}`} key={index}>{message.content}</article>
            ))}
          </div>
          <div className="chat-controls">
            {chatMode === 'voice' && (
              <div className="voice-settings">
                <label htmlFor="voice-choice">回复音色</label>
                <select id="voice-choice" value={voice} onChange={event => changeVoice(event.target.value)}>
                  {VOICE_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
                <button className="secondary" onClick={() => void speakText('你好，我是你的心灵树洞，很高兴见到你。')} disabled={isSpeaking || isRecording || isTranscribing || busy}>试听</button>
                {isSpeaking && <span role="status">正在朗读…</span>}
                <button className="secondary" onClick={() => { stopSpeech(); setIsSpeaking(false); }} disabled={!isSpeaking}>停止播放</button>
              </div>
            )}
            <div className="composer sticky-composer">
              {chatMode === 'text' ? (
                <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="写下你想说的话…" maxLength={5000} disabled={busy || isTranscribing} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} />
              ) : (
                <p className="voice-prompt" role="status">
                  {isRecording ? '正在录音，说完请再次点击麦克风' : isTranscribing ? '正在识别语音…' : busy ? '正在生成回复…' : isSpeaking ? '正在朗读回复…' : '点击麦克风开始语音对话'}
                </p>
              )}
              <button type="button" className={isRecording ? 'record-button recording' : 'record-button'} onClick={() => isRecording ? stopRecording() : void startRecording()} disabled={busy || isTranscribing} aria-label={isRecording ? '停止录音并识别' : '开始录音'} aria-pressed={isRecording}>
                {isTranscribing ? '识别中…' : isRecording ? '■ 停止' : '🎙 录音'}
              </button>
              {chatMode === 'text' && <button onClick={() => void sendMessage()} disabled={busy || isTranscribing}>{busy ? '…' : '发送'}</button>}
            </div>
            <p className="voice-disclaimer">语音会发送至 AI 服务进行识别或合成；请勿提供敏感个人信息。</p>
          </div>
        </section>
      )}
      {notice && <div className="floating-notice">{notice}</div>}
    </main>
  );
}
