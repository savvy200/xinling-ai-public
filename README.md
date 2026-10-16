# 🌿 心灵树洞 · Xinling AI

**一个可以写下心情、整理思绪的 AI 辅助对话空间。** 通过简洁的聊天界面，你可以记录想法、表达感受，并探索 AI 如何参与日常自我反思。

**A gentle space for thoughts and reflection.** Xinling AI is a lightweight, AI-assisted wellbeing conversation demo where you can put feelings into words, organize your thoughts, and explore reflective conversations.

[**🌱 在线体验 / Try Live Demo →**](https://xinling-ai.lovable.app/) · [**💻 查看代码 / Explore Source →**](https://github.com/savvy200/xinling-ai-public/tree/main/src) · [**💬 反馈问题 / Give Feedback →**](https://github.com/savvy200/xinling-ai-public/issues/new)

> [!IMPORTANT]
> **中文：** 本项目是探索性软件演示，不是心理治疗、医疗诊断或紧急求助服务。请勿使用它代替专业医生、心理健康专业人员或紧急服务。避免输入敏感、可识别的健康或个人信息。
>
> **English:** This is an exploratory software demo, not medical care, psychological therapy, diagnosis, or an emergency support service. Do not substitute it for professional care. Avoid entering sensitive or identifying personal or health information.

---

## ✨ 为什么体验？ / Why try it?

| 中文 | English |
| --- | --- |
| 🗣️ **写下心情** — 在聊天界面记录感受与想法 | **Express yourself** — Put thoughts and feelings into words in a simple chat interface |
| 💭 **AI 辅助对话** — 体验逐步显示的 AI 回复 | **Streaming AI chat** — See assistant responses appear as they are generated |
| 🎙️ **语音对话** — 麦克风转文字、AI 语音回复与六种音色选择 | **Voice conversations** — Speech-to-text, spoken AI replies, and six selectable voice profiles |
| 🌿 **轻量界面** — 简单的登录、输入与聊天流程 | **Focused experience** — A minimal sign-in and conversation flow |
| 🛠️ **可研究的技术示例** — React、TypeScript、Supabase 和 Edge Functions | **Developer-friendly demo** — Explore a React, TypeScript, Supabase and Edge Functions implementation |

### 🚀 如何体验 / Get started online

1. 打开 [在线体验 / Live demo](https://xinling-ai.lovable.app/)。 / Open the live demo.
2. 按页面提示注册或登录（需要邮箱与密码；是否需要邮件验证取决于网站配置）。 / Sign up or sign in using the on-screen instructions.
3. 在输入框里写下想说的话并发送，或切换到“语音”模式并允许麦克风权限。 / Send a text message, or switch to Voice and grant microphone access.

> **关于演示版 / Demo scope:** 公开仓库是独立、精简的软件示例，可能与在线网站的部署配置或其他版本功能不同。本仓库本身不包含可直接访问的线上用户数据。 / This repository is a standalone public edition and may differ from the live deployment or other editions; it does not expose hosted user records.

---

## 🔍 本仓库有什么？ / What is in this repository?

| 功能 / Feature | 本公开版本 / Public edition |
| --- | --- |
| 邮箱登录与注册 / Email sign-in & sign-up | Supabase Auth |
| 对话界面 / AI chat | 流式回复界面 / Streaming response UI |
| 语音输入 / Voice input | 浏览器麦克风录音 + 服务器端语音转写 / Browser recording + server-side transcription |
| 语音回复 / Spoken AI replies | 流式 PCM 音频播放，六种预置音色及试听 / Streamed PCM playback, six voice profiles and preview |
| 用户范围隔离 / Per-user data scoping | 使用 Supabase Row Level Security (RLS) 的训练/上下文数据 |
| 管理功能 / Admin features | 经授权的角色才可使用 / Available to authorized roles |
| 服务端访问 / Backend calls | 携带登录凭证的 Supabase Edge Function 请求 / JWT-authenticated Edge Function |
| 敏感凭据 / Secrets | 不写入仓库；服务端变量另行配置 / Kept out of the public repository |

**代码导览 / Code map:** [聊天和登录界面](src/App.tsx) · [语音播放](src/lib/speechPlayer.ts) · [样式](src/index.css) · [Supabase 客户端](src/lib/supabase.ts) · [聊天函数](supabase/functions/chat-therapy/index.ts) · [语音识别函数](supabase/functions/voice-transcribe/index.ts) · [语音合成函数](supabase/functions/voice-speech/index.ts) · [安全指南](SECURITY.md)

**技术栈 / Stack:** React 18 · TypeScript · Vite · Supabase Auth + PostgreSQL + RLS · Supabase Edge Functions

### 🔐 隐私与安全 / Privacy & security

- 浏览器只使用公开的 Supabase 客户端配置；不应包含服务端特权密钥。 / The browser uses publishable configuration, not privileged server credentials.
- RLS 和鉴权需要在实际部署的 Supabase 环境中正确配置及验证。 / RLS and authentication must be configured and verified in the deployed Supabase environment.
- 不要把病历、联系方式或其他敏感信息发布到公开 Issues 中。 / Never share medical records, contact information, or other sensitive data in public issues.
- 本仓库不提供对私人 Lovable 工作区、无关私有项目或用户账户的访问。 / This repository does not grant access to private Lovable workspaces, unrelated projects, or user accounts.

有关公开部署前应完成的安全检查，请阅读 [SECURITY.md](SECURITY.md)。 / Please see the [security checklist](SECURITY.md) before deploying.

---

## 🧑‍💻 在本地运行 / Run locally

**需要 / Requirements:** Node.js、npm，以及自行创建的 Supabase 项目。 / Node.js, npm, and your own Supabase project.

```bash
git clone https://github.com/savvy200/xinling-ai-public.git
cd xinling-ai-public
npm install
cp .env.example .env
npm run dev
```

在本地 `.env` 中填写 **你自己** 的 Supabase 公共配置： / Put **your own** Supabase client values in `.env`:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_ANON_KEY
```

请勿提交 `.env`。 / Never commit `.env`.

### 配置 Supabase / Configure Supabase

1. 创建独立的 Supabase 项目。 / Create a dedicated Supabase project.
2. 应用 [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql)。 / Apply the database migration.
3. 分别部署 `chat-therapy`、`voice-transcribe` 和 `voice-speech` 三个 Supabase Edge Functions（位于 [supabase/functions](supabase/functions)）。 / Deploy all three Edge Functions.
   ```bash
   supabase functions deploy chat-therapy
   supabase functions deploy voice-transcribe
   supabase functions deploy voice-speech
   ```
4. 仅在服务端安全环境中配置以下变量。 / Configure the following **server-side secrets only**:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
LOVABLE_API_KEY
```

**管理员 / Admin:** 部署后按需要手动配置角色。不要提交真实管理员 UUID 或邮箱。 / Assign admin roles manually; never hard-code real admin identities.

**开放注册前 / Before public sign-up:** 为聊天、语音转写与语音合成等收费端点增加限流、配额、机器人防护及成本监控。 / Add rate limits, quotas, bot protection, and cost alerts for paid chat, transcription, and TTS endpoints.

**语音注意事项 / Voice note:** 语音录制需 HTTPS/localhost、浏览器麦克风权限与可正常访问的 Supabase Edge Functions。音频会发送给配置的 AI 网关处理；公开版代码不存储语音录音，但服务提供商的数据处理规则仍适用。部分语音模型与 API 可用性取决于你自己的 Lovable AI Gateway 配置，不能仅通过克隆仓库保证可用。 / Voice requires HTTPS/localhost, microphone permission, deployed Edge Functions, and an AI gateway account supporting the configured speech models. Audio is transmitted to the AI gateway; the public source does not persist recordings. Review the provider's data-processing policies.

**版本说明 / Edition note:** 新增语音功能移植自 2026-10-16 的 Lovable 项目版本；本仓库仍是独立公开精简版，未逐文件复制生产环境与数据库。 / Voice features were adapted from the 2026-10-16 Lovable project; this remains a standalone public edition, not a byte-for-byte production deployment.

---

## 🤝 欢迎交流 / Feedback & contributions

欢迎反馈界面体验、报告 Bug 或建议改进：[创建 GitHub Issue](https://github.com/savvy200/xinling-ai-public/issues/new)。请勿在公开反馈中透露私密内容。

Feedback about the UI, bugs, or improvements is welcome through [GitHub Issues](https://github.com/savvy200/xinling-ai-public/issues/new). Please keep private or sensitive information out of public posts.

### 开源许可 / License

当前尚未选择开源许可。公开可见不代表可以自由复制、修改或商用。 / No open-source license has been selected yet. Public visibility does not grant permission to reuse, modify, or redistribute the code.

---

<sub>心灵树洞 · Xinling AI — AI 辅助自我反思软件演示 / An AI-assisted reflection software demo.</sub>
