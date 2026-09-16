# 心灵树洞 · Xinling AI

A lightweight public edition of an AI-assisted wellbeing conversation application built with React, TypeScript and Supabase.

## Live demo

**Try it online:** https://xinling-ai.lovable.app/

> **Scope:** This repository is a standalone software demo. It is not a medical device, does not provide diagnosis or treatment, and is not a substitute for professional or emergency care.

## What is included

- Email/password authentication with Supabase Auth
- Streaming AI chat interface
- Per-user training/context data protected by Row Level Security (RLS)
- Optional role-based admin access
- Supabase Edge Function with authenticated JWT validation
- Clean environment-variable setup with no committed secrets

## What is intentionally not included

This public repository does **not** include or grant access to:

- private Lovable workspaces or project links
- unrelated private projects or repositories
- developer account credentials
- Supabase service-role keys
- AI gateway API keys
- real administrator UUIDs or email addresses
- private Git history from the development repository

## Tech stack

- React 18
- TypeScript
- Vite
- Supabase Auth / Postgres / RLS / Edge Functions

## Local setup

```bash
git clone https://github.com/savvy200/xinling-ai-public.git
cd xinling-ai-public
npm install
cp .env.example .env
npm run dev
```

Set these client-side values in `.env` using **your own** Supabase project:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_ANON_KEY
```

Do not commit `.env`.

## Supabase setup

1. Create your own Supabase project.
2. Apply `supabase/migrations/001_init.sql`.
3. Deploy `supabase/functions/chat-therapy/index.ts` as an Edge Function.
4. Configure the following server-side secrets in your Supabase project:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
LOVABLE_API_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` and `LOVABLE_API_KEY` must remain server-side only.

### Admin role

The public migration intentionally does not hard-code an administrator identity. Assign an `admin` role manually in your own Supabase project after the intended user account exists.

## Security model

- The browser uses only a public/anonymous Supabase key.
- Authorization is enforced by RLS, not by hiding the client key.
- Training data is scoped to `auth.uid()`.
- The chat Edge Function validates the caller's Supabase JWT before using privileged server credentials.
- No private Lovable workspace URL is required for this repository.

See [SECURITY.md](SECURITY.md) for deployment guidance.

## Public demo note

If you expose a live deployment to unrestricted registration, add application-level abuse controls such as rate limiting, quotas, bot protection and cost monitoring before attaching a paid AI endpoint.

## License

No open-source license has been selected yet. Until a license is added, normal copyright rules apply.
