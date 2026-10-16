import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB，低于网关 25MiB 上限

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  try {
    // 验证用户身份
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "未授权访问" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "身份验证失败" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 限制上传大小
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > MAX_FILE_BYTES) {
      return new Response(JSON.stringify({ error: "音频文件过大" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || !file.size || file.size > MAX_FILE_BYTES) {
      return new Response(JSON.stringify({ error: "无效的音频文件" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!file.type.startsWith("audio/")) {
      return new Response(JSON.stringify({ error: "请上传音频文件" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const upstreamForm = new FormData();
    upstreamForm.append("model", "openai/gpt-transcribe");
    upstreamForm.append("file", file, file.name || "recording.webm");
    upstreamForm.append("response_format", "json");
    upstreamForm.append("stream", "true");

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: upstreamForm,
    });

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text();
      return new Response(JSON.stringify({ error: `语音识别失败 (${upstream.status})`, detail: errText.slice(0, 200) }), {
        status: upstream.status === 429 ? 429 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 消费 SSE 流，拼接完整转写文本
    const reader = upstream.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    let transcript = "";
    let doneText = "";
    let streamError = "";

    const handleEvent = (dataStr: string) => {
      try {
        const payload = JSON.parse(dataStr);
        if (payload.type === "transcript.text.delta" && typeof payload.delta === "string") {
          transcript += payload.delta;
        } else if (payload.type === "transcript.text.done" && typeof payload.text === "string") {
          doneText = payload.text;
        } else if (payload.type === "error" || payload.error) {
          streamError = dataStr.slice(0, 200);
        }
      } catch { /* 忽略不完整行 */ }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += value;
      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (line.startsWith("data:")) handleEvent(line.slice(5).trim());
      }
    }
    if (buffer.trim().startsWith("data:")) handleEvent(buffer.trim().slice(5).trim());

    const finalText = (doneText || transcript).trim();
    if (streamError || !finalText) {
      return new Response(JSON.stringify({ error: streamError || "没有识别到语音内容，请再试一次" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ text: finalText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "未知错误" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});