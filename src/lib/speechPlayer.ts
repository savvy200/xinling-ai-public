// 播放来自 voice-speech Edge Function 的 PCM SSE 流（24kHz, 16-bit, mono）
let currentContext: AudioContext | null = null;
let currentSources: Set<AudioBufferSourceNode> | null = null;

export function stopSpeech() {
  if (currentSources) {
    for (const source of currentSources) {
      try { source.stop(); } catch { /* already stopped */ }
    }
    currentSources.clear();
  }
  if (currentContext) {
    currentContext.close().catch(() => {});
    currentContext = null;
  }
}

export async function playSpeech(endpoint: string, accessToken: string, text: string, voice = "Kore"): Promise<void> {
  stopSpeech();

  const context = new AudioContext({ sampleRate: 24000 });
  currentContext = context;
  const sources = new Set<AudioBufferSourceNode>();
  currentSources = sources;
  let playhead = 0;
  let pending = new Uint8Array(0);
  let completed = false;
  let samplesPlayed = 0;
  let playback: Promise<void> = Promise.resolve();

  try {
    if (context.state === "suspended") await context.resume();

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ text, voice }),
    });
    if (!response.ok || !response.body) {
      const errText = await response.text();
      throw new Error(`语音合成失败: ${response.status} ${errText.slice(0, 100)}`);
    }

    const handleEvent = (dataStr: string) => {
      const payload = JSON.parse(dataStr) as { type?: string; audio?: string; error?: unknown };
      if (payload.type === "error" || payload.error) throw new Error("语音流错误");
      if (payload.type === "speech.audio.done") {
        completed = true;
        return;
      }
      if (payload.type !== "speech.audio.delta" || !payload.audio) return;

      const incoming = Uint8Array.from(atob(payload.audio), (c) => c.charCodeAt(0));
      const bytes = new Uint8Array(pending.length + incoming.length);
      bytes.set(pending);
      bytes.set(incoming, pending.length);
      const usable = bytes.length - (bytes.length % 2);
      const view = new DataView(bytes.buffer);
      const samples = new Float32Array(usable / 2);
      for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
      pending = bytes.slice(usable);
      if (!samples.length) return;

      samplesPlayed += samples.length;
      const buffer = context.createBuffer(1, samples.length, 24000);
      buffer.copyToChannel(samples, 0);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      sources.add(source);
      playback = new Promise<void>((resolve) => {
        source.onended = () => {
          sources.delete(source);
          resolve();
        };
      });
      playhead = Math.max(playhead, context.currentTime + 0.05);
      source.start(playhead);
      playhead += buffer.duration;
    };

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let bufferText = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bufferText += value;
      let idx: number;
      while ((idx = bufferText.indexOf("\n")) !== -1) {
        const line = bufferText.slice(0, idx).trim();
        bufferText = bufferText.slice(idx + 1);
        if (line.startsWith("data:")) handleEvent(line.slice(5).trim());
      }
    }
    if (bufferText.trim().startsWith("data:")) handleEvent(bufferText.trim().slice(5).trim());

    if (!completed || !samplesPlayed) throw new Error("语音流不完整");
    await playback;
  } finally {
    if (currentContext === context) {
      currentContext = null;
      currentSources = null;
    }
    for (const source of sources) {
      try { source.stop(); } catch { /* already stopped */ }
    }
    await context.close().catch(() => {});
  }
}