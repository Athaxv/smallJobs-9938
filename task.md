# SmallJobs Task Tracker

## Status: Login Fix Applied ✅

### Root Cause (Confirmed)
Login loop: Expo web (4300) makes cross-origin requests to API (4200).
Browser blocks cookies on cross-origin requests unless `credentials: 'include'` is set.

### Fixes Applied
1. `lib/auth.ts` — web client uses `createAuthClient` (no expoClient) + `fetchOptions: { credentials: 'include' }`
2. `lib/api.ts` — Hono RPC client uses custom fetch with `credentials: 'include'` on web, cookie header on native
3. `app/(tabs)/index.tsx` — `createdAt: string | number` to fix TS error
4. `lib/auth.ts` — removed duplicate export (old code was appended)
5. Server CORS already correct: `credentials: true`, origin reflects requesting origin

### Test User
- Email: debug@smalljobs.com / password123
- isOnboarded: true, location: Bengaluru

### Next Steps (priority order)
1. Verify login works in browser (4300 preview)
2. `thread/[id].tsx` — real post + author, "I'm Interested" → POST /api/responses
3. `(tabs)/inbox.tsx` — GET /api/messages/conversations
4. `chat/[id].tsx` — real messages + send + polling
5. `(tabs)/profile.tsx` — sign out wiring
6. Fix tab bar badge (hardcoded "2")
