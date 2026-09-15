# Compass API

Target:
- Cloudflare Workers
- D1
- R2
- Workers AI

Authentication:
- Better Auth is a candidate, not a frozen dependency.
- Phase 7 must begin with a compatibility spike.
- If Better Auth + D1 is awkward, select a maintained Worker-compatible solution.
- Do not switch the project to Supabase solely because an auth library is inconvenient.

No backend implementation belongs in Phase 0.