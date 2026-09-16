import { FormEvent, useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

type Message = { role: 'user' | 'assistant'; content: string };
type TrainingRow = { id: string; content: string; category: string | null };

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

  async function sendMessage() {
    const text = input.trim();
    if (!text || busy) return;
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
          {isAdmin && <button className="secondary" onClick={async () => { setShowAdmin(!showAdmin); if (!showAdmin) await loadTrainingData(); }}>{showAdmin ? 'Chat' : 'Admin'}</button>}
          <button className="secondary" onClick={() => supabase.auth.signOut()}>Sign out</button>
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
          <div className="composer sticky-composer">
            <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="写下你想说的话…" maxLength={5000} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} />
            <button onClick={sendMessage} disabled={busy}>{busy ? '…' : 'Send'}</button>
          </div>
        </section>
      )}
      {notice && <div className="floating-notice">{notice}</div>}
    </main>
  );
}
