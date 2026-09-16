# Security Policy

## Reporting a vulnerability

Please do not publish suspected credentials, tokens, personal data or exploitable security details in a public issue. Contact the repository owner privately through an appropriate channel instead.

## Deployment checklist

Before deploying a fork or public demo:

1. Use a dedicated Supabase project for this application.
2. Keep `.env` files out of Git.
3. Keep `SUPABASE_SERVICE_ROLE_KEY`, AI gateway keys and other privileged credentials in server-side secret storage only.
4. Verify Row Level Security is enabled on every table exposed through the Supabase API.
5. Test that one authenticated user cannot read or modify another user's rows.
6. Assign administrative roles manually; do not commit real user IDs or emails.
7. Review Supabase Auth settings before enabling unrestricted public signup.
8. Add rate limiting, quotas, bot protection and cost alerts before exposing a paid AI endpoint publicly.
9. Avoid using confidential, clinical, identifiable or otherwise sensitive personal information in a demo deployment unless the necessary governance and security controls are independently in place.
10. Rotate credentials immediately if a privileged credential is ever committed or exposed.

## Repository boundary

This repository is intended to contain only the standalone Xinling AI public edition. It should never contain links or credentials that grant editing access to private Lovable workspaces, unrelated projects, private repositories or developer accounts.
