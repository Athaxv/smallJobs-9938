# SmallJobs — Full Founder Audit

> Complete inspection of the codebase as of May 2026. No code was changed during this audit.

---

## 1. What's Actually Built

### Architecture
- **Mobile** — Expo (React Native) app at `packages/mobile`
- **Web/API** — Hono server + Vite frontend at `packages/web`
- **Database** — SQLite via Drizzle ORM (Turso-compatible)
- **Auth** — Better Auth `1.6.11` + `@better-auth/expo` plugin

### Screen inventory

| Screen | File | Status |
|---|---|---|
| Entry/splash | `app/index.tsx` | Exists — empty, AuthGuard redirects immediately |
| Welcome / onboarding | `app/onboarding.tsx` | ✅ Full — two sub-views, GPS location, profile setup |
| Login | `app/auth/login.tsx` | ✅ Full — email+pw, Google stub |
| Sign up | `app/auth/signup.tsx` | ✅ Full — email+pw, Google stub |
| Feed (Home) | `app/(tabs)/index.tsx` | ✅ Full UI — **100% mock data** |
| Explore | `app/(tabs)/explore.tsx` | ✅ Full UI — **100% mock data** |
| Inbox | `app/(tabs)/inbox.tsx` | ✅ Full UI — **100% mock data** |
| Profile | `app/(tabs)/profile.tsx` | ✅ Full UI — **100% hardcoded ("Rahul Mehta")** |
| Post — Entry | `app/post/index.tsx` | ✅ Full — text input, examples |
| Post — AI Questions | `app/post/ai-followup.tsx` | ✅ Full — chat UI, hits `/api/ai/analyze` |
| Post — Preview | `app/post/preview.tsx` | ✅ Full — hits `/api/ai/structure`, fallback preview |
| Post — Success | `app/post/success.tsx` | ✅ Full — animation, hardcoded stats |
| Thread detail | `app/thread/[id].tsx` | ✅ Full UI — reads from mock data |
| Chat | `app/chat/[id].tsx` | ✅ Full UI — seed messages, local state only |

### API surface

| Endpoint | Method | Auth | Does |
|---|---|---|---|
| `/api/auth/*` | GET/POST | — | Better Auth (login, signup, session, OAuth) |
| `/api/health` | GET | none | Alive check |
| `/api/ping` | GET | none | Timestamp pong |
| `/api/profile` | GET | required | Get/create own profile from DB |
| `/api/profile` | PATCH | required | Update bio, avatar, location, isOnboarded |
| `/api/profile/:userId` | GET | none | Public profile lookup |
| `/api/ai/analyze` | POST | none | Raw request → 2-3 follow-up questions via LLM |
| `/api/ai/structure` | POST | none | Request + answers → structured thread object via LLM |

### Database schema

Tables: `user`, `session`, `account`, `verification` (Better Auth managed) + `profiles`, `posts`, `responses`, `conversations`, `messages` (app-defined).

---

## 2. What Works End-to-End Today

- **Sign up / login** — email+password flow is fully wired. Better Auth → DB → session → Hono auth middleware → profile route.
- **Onboarding** — GPS location, name, bio. On submit patches `/api/profile` with `isOnboarded: true`, then navigates to tabs.
- **Auth guard** — `AuthGuard` in `_layout.tsx` reactively redirects based on session + `isOnboarded`. Logic is solid.
- **AI post flow** — Entry → AI questions → Preview all wire to real API endpoints (`/api/ai/analyze`, `/api/ai/structure`). Both have graceful offline fallbacks so the flow works even without LLM keys.
- **Session storage** — Uses `expo-secure-store` with `:` → `_` colon substitution. Correct.
- **Hono RPC client** — `api.ts` uses Hono's typed client (`hc`) with session cookie forwarded. Type-safe.

---

## 3. Critical Bugs / Blockers

### 3.1 AI route uses wrong LLM config
**File:** `packages/web/src/api/routes/ai.ts`

```ts
const GROQ_API_KEY = process.env.OPENAI_API_KEY ?? '';
const GROQ_BASE = 'https://api.groq.com/openai/v1';
const MODEL = 'openai/gpt-oss-120b';
```

Three problems in three lines:
- Uses `OPENAI_API_KEY` env var but points to `api.groq.com` — these are different services with different keys.
- `openai/gpt-oss-120b` is not a real Groq model. Groq models are `llama3-70b-8192`, `mixtral-8x7b-32768`, etc.
- If neither key is set, every AI call silently returns `ok: false` and falls back to local heuristics. **The AI post flow appears to work but is never actually calling an LLM.**

**Fix:** Set `GROQ_API_KEY` in `.env`, change the env var name to match, pick a real Groq model, or switch to OpenAI and set `OPENAI_API_KEY`.

### 3.2 "Post Thread" button does NOT save to database
**File:** `app/post/preview.tsx` line ~200

```ts
onPress={() => router.replace('/post/success')}
```

Tapping "Post Thread" navigates to the success screen with no API call. Nothing is written to the `posts` table. The entire post flow — AI questions, structured preview — produces a thread that **exists only in memory** and vanishes.

**Fix:** Add `POST /api/posts` endpoint; call it in `preview.tsx` before navigation.

### 3.3 "Forgot password" is a dead button
**File:** `app/auth/login.tsx`

```tsx
<TouchableOpacity onPress={/* nothing */}>
  <Text>Forgot password?</Text>
</TouchableOpacity>
```

`onPress` has no handler. Tapping it does nothing. Better Auth supports password reset emails out of the box — just needs to be wired up.

### 3.4 Google OAuth is broken
**File:** `packages/web/src/api/auth.ts`

```ts
google: {
  clientId: process.env.GOOGLE_CLIENT_ID as string,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
}
```

Both env vars are missing from `.env`. Google sign-in buttons exist in login and signup screens but will throw at runtime. The `as string` cast suppresses TypeScript's warning.

**Fix:** Either set the Google creds, or remove the `socialProviders.google` block and hide the Google buttons from the UI.

---

## 4. Data Layer — All Screens Are Mocked

Every tab and most screens are driven by `lib/mockData.ts`. **No screen reads from the database at runtime.** This is fine for a prototype but means:

- Feed shows the same 8 threads to every user always.
- Profile shows "Rahul Mehta" regardless of who is logged in.
- Inbox shows 2 hardcoded conversations.
- Thread detail, chat — all mock.
- The `posts`, `responses`, `conversations`, `messages` tables exist in the DB schema but **no API routes expose them yet** (the schema is ahead of the API).

The `isOnboarded` flag and user profile are the only pieces of user state actually persisted to the DB.

---

## 5. UX / Logic Issues

### 5.1 Greeting and name are hardcoded
`app/(tabs)/index.tsx`:
```tsx
<Text>Good evening</Text>
<Text>Hey, Rahul 👋</Text>
```
The greeting time doesn't use `new Date()` and the name is not from session. Should pull from `authClient.useSession()` and compute greeting from `Date().getHours()`.

### 5.2 Notification badge is hardcoded
`app/(tabs)/_layout.tsx`:
```tsx
tabBarBadge: 2,
```
Hardcoded integer on the Inbox tab. Should be dynamic from real unread count.

### 5.3 "See all" taps do nothing
Both "Near You" and "Remote & Online" sections in the Feed have `<TouchableOpacity>` with `<Text>See all</Text>` but no `onPress`.

### 5.4 Settings buttons on Profile are no-ops
"Notifications", "Privacy & Safety" — rendered as `TouchableOpacity` with no `onPress`. "Sign Out" also has no `onPress` — it does not actually sign the user out.

### 5.5 Sign Out doesn't work
`app/(tabs)/profile.tsx` — Sign Out list item has no `onPress`. Should call `authClient.signOut()` (exported from `lib/auth.ts` as `signOut()`). The function is already written, just not connected to the button.

### 5.6 Mic button on post entry does nothing
`app/post/index.tsx` — mic icon button exists but has no handler. Expected: voice-to-text for the request field.

### 5.7 "View Profile" in thread detail does nothing
`app/thread/[id].tsx` — "View Profile" button has no `onPress`.

### 5.8 Success screen stats are hardcoded
`app/post/success.tsx`:
```tsx
{ label: 'Est. reach', value: '~40 people' },
{ label: 'Expires in', value: '24 hours' },
```
These should come from the structured thread returned by the AI or the saved post.

### 5.9 "View my thread" goes to hardcoded `/thread/1`
`app/post/success.tsx`:
```tsx
onPress={() => router.push('/thread/1')}
```
Should use the ID of the newly created post, once posting is wired to the DB.

### 5.10 AI endpoint has no auth guard
`/api/ai/analyze` and `/api/ai/structure` are fully public — no authentication required. Anyone can spam the LLM API with requests. Should add `requireAuth` middleware, or at minimum rate limiting.

### 5.11 `FontWeight` imported but unused in 4 files
`ai-followup.tsx`, `preview.tsx`, `success.tsx`, `chat/[id].tsx` all import `FontWeight` from theme but never use it. Minor — just dead imports.

### 5.12 Post tab route is a dummy
`app/(tabs)/post-tab.tsx` returns `<View />`. The tab layout correctly hides it and uses a floating FAB instead, so functionally fine — but the file could be removed or clearly commented.

---

## 6. Architecture Notes

### What's solid
- **Theme system** (`lib/theme.ts`) — fully consistent. Colors, spacing, radius, fonts, shadows all in one place. Every screen uses it. Good.
- **Hono RPC client** — type-safe API client from `hc<AppType>`. Correct pattern; will catch breaking changes at compile time.
- **Auth client** — properly uses `expoClient` plugin + `storageAdapter` with SecureStore. Cookie forwarding in `api.ts` is correct.
- **AI fallback** — all three AI-dependent screens have local heuristic fallbacks. The flow never crashes even with no API key.
- **Error boundary** — `_layout.tsx` wraps the whole app in an `ErrorBoundary`. Good.
- **Profile auto-create** — `GET /api/profile` creates a profile row if one doesn't exist. Idempotent. Good.
- **Schema is forward-looking** — `posts`, `responses`, `conversations`, `messages` tables exist in schema, ready to be wired to API routes.
- **CORS config** — `trustedOrigins` uses a callback (not a static string) to accept the request's own origin. Works for local dev and proxied URLs.

### What needs attention
- **No posts API routes** — the schema has `posts`, `responses`, `conversations`, `messages` but zero Hono routes expose them. The entire social layer of the app (posting, browsing real threads, responding, chatting) requires these to be built.
- **No pagination/infinite scroll** — Feed and Explore just dump all mock threads. When real data arrives, this needs pagination.
- **Messages table has no WebSocket/realtime** — Chat screen is local state only. Real chat needs either polling or a WebSocket/SSE layer.
- **No push notifications setup** — `expo-notifications` not installed. The app promises "you'll get a notification" on the success screen but has no notifications infrastructure.
- **`better-auth` version gap** — upgraded from `1.4.22` to `1.6.11` to fix the Metro bundle issue. The DB schema auto-managed by Better Auth may have changed between these versions. Run `npx drizzle-kit push` if auth tables start throwing column errors.

---

## 7. What to Build Next (Priority Order)

### P0 — Makes the app actually functional
1. **Fix AI endpoint** — correct env var name + real Groq/OpenAI model name
2. **`POST /api/posts` route** — save structured thread to DB, return the post ID
3. **Wire "Post Thread" button** — call the new route, pass post ID to success screen
4. **Sign Out button** — call `authClient.signOut()` in profile screen
5. **Wire profile screen to real session** — use `authClient.useSession()` for name, avatar

### P1 — Core social features
6. **`GET /api/posts` route** — list posts (with filters: type, category, status), replace mock feed
7. **`GET /api/posts/:id` route** — single post detail, replace mock thread screen
8. **`POST /api/responses` route** — "I'm Interested" button on thread detail
9. **`GET /api/conversations` + `GET /api/messages`** — real inbox and chat
10. **`POST /api/messages`** — send a message

### P2 — Polish
11. Dynamic greeting (time-based + real user name)
12. Dynamic notification badge (real unread count)
13. Google OAuth creds or remove the buttons
14. Forgot password flow
15. Push notifications (`expo-notifications`)
16. Rate limiting on AI routes

---

## 8. One-Line Summary Per File

| File | Summary |
|---|---|
| `_layout.tsx` | Auth guard + routing logic. Solid. |
| `index.tsx` | Empty entry point, only exists for routing. |
| `onboarding.tsx` | Two-stage onboarding. Works. GPS location good. |
| `auth/login.tsx` | Works. Forgot password is dead button. |
| `auth/signup.tsx` | Works. Password validation client-side only. |
| `(tabs)/_layout.tsx` | Tab bar + FAB. Good. Badge hardcoded. |
| `(tabs)/index.tsx` | Feed UI. Polished. Fully mocked. Name/greeting hardcoded. |
| `(tabs)/explore.tsx` | Search + category filter. Works on mock data. |
| `(tabs)/inbox.tsx` | Conversation list. Fully mocked. |
| `(tabs)/profile.tsx` | Static "Rahul Mehta" profile. Sign out is dead. |
| `(tabs)/post-tab.tsx` | Placeholder. FAB handles navigation instead. |
| `post/index.tsx` | Request entry. Good UX. Mic button is dead. |
| `post/ai-followup.tsx` | Chat UI for AI questions. Works with fallback. |
| `post/preview.tsx` | AI preview. Good UI. Post button doesn't save. |
| `post/success.tsx` | Success animation. Hardcoded stats. "View thread" goes to /thread/1. |
| `thread/[id].tsx` | Thread detail. Good UI. Mock data. "View Profile" dead. |
| `chat/[id].tsx` | Chat UI. Functional local state. No backend. |
| `lib/auth.ts` | Auth client. Correctly configured. |
| `lib/api.ts` | Hono RPC client. Type-safe. Cookie forwarding correct. |
| `lib/theme.ts` | Design system. Complete, consistent, well-structured. |
| `api/routes/profile.ts` | CRUD for profiles. Works. |
| `api/routes/ai.ts` | LLM questions + structuring. Wrong model/key config. |
| `api/database/schema.ts` | Full schema ahead of API. Good foundation. |
| `api/auth.ts` | Better Auth config. Google creds missing. |
| `api/index.ts` | Hono app. Routes mounted correctly. |
