# TODO — Fix Vercel deployment (ERR_REQUIRE_ESM on uuid)

Goal: make register/login work on Vercel without needing an Upstash Redis / KV store.

## Steps
- [x] 1. Replace `uuid` (ESM-only v14) with built-in `crypto.randomUUID()` in:
  - backend/src/services/tokenService.js
  - backend/src/models/userModel.js
  - backend/src/models/refreshTokenModel.js (remove unused import)
- [x] 2. Remove `uuid` dependency from root `package.json`
- [x] 3. Remove `uuid` + unused `@upstash/redis` from `backend/package.json`
- [x] 4. Re-sync lockfiles: `npm install` at root and in `backend/`
- [x] 5. Update README deploy section (no KV/Redis required; in-memory on Vercel)
- [x] 6. Verify backend still works locally (register/login smoke test) — PASSED (200 OK under VERCEL=1 simulation)

## Result
- Root cause: `uuid@14` is ESM-only; `require('uuid')` throws `ERR_REQUIRE_ESM` on Vercel's Node 20 runtime, crashing the serverless function for register/login.
- `@upstash/redis` was unrelated (db.js uses in-memory on Vercel) — removed as unused dependency.
- Smoke test (register + login) returned 200 with access tokens under `VERCEL=1` (in-memory store).

