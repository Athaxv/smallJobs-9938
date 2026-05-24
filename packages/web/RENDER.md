# Deploying SmallJobs on Render

The **backend and website** live in this package. One Render Web Service serves both.

## Render dashboard settings

Create a **Web Service** (not Static Site) connected to your Git repo.

| Setting | Value |
|---------|--------|
| **Name** | `smalljobs` (or your choice) |
| **Region** | Closest to your users (e.g. Singapore / Mumbai region if available) |
| **Branch** | `main` |
| **Root Directory** | `packages/web` |
| **Runtime** | Node *(start uses Bun — see build command)* |
| **Build Command** | `cd ../.. && bun install && cd packages/web && bun run build` |
| **Start Command** | `bun run start` |
| **Health Check Path** | `/api/health` |

If Render does not have Bun on the build image, use this **Build Command** instead:

```bash
curl -fsSL https://bun.sh/install | bash && export PATH="$HOME/.bun/bin:$PATH" && cd ../.. && bun install && cd packages/web && bun run build
```

**Start Command** (Node fallback if Bun is unavailable at runtime):

```bash
bun run start:node
```

Or install Bun in a Dockerfile — see Render docs for Docker deploys.

---

## Environment variables (Render → Environment)

Set these in the Render dashboard. **`WEBSITE_URL` must match your live Render URL.**

| Key | Example | Required |
|-----|---------|----------|
| `NODE_ENV` | `production` | Yes |
| `WEBSITE_URL` | `https://smalljobs-xxxx.onrender.com` | Yes — no trailing slash |
| `BETTER_AUTH_SECRET` | long random string | Yes |
| `DATABASE_URL` | Turso `libsql://...` | Yes |
| `DATABASE_AUTH_TOKEN` | Turso token | Yes |
| `GROQ_API_KEY` | Groq API key | Yes (for AI post flow) |

Optional:

| Key | Purpose |
|-----|---------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google sign-in |
| `VITE_APK_DOWNLOAD_URL` | External APK URL (default: `/smalljobs.apk` on same site) |

After first deploy, copy your Render URL into `WEBSITE_URL`, redeploy, then update mobile `app.json` `apiUrl` before building the APK.

---

## Verify after deploy

```text
https://YOUR-APP.onrender.com/api/health   → {"status":"ok"}
https://YOUR-APP.onrender.com/api/ping     → {"message":"Pong! ..."}
https://YOUR-APP.onrender.com/             → landing page
```

---

## Local production test

From repo root:

```bash
cd packages/web
bun run build
bun --env-file=../../.env run start
```

Open `http://localhost:4200` and `http://localhost:4200/api/ping`.

---

## APK + mobile app

1. Place built APK at `public/smalljobs.apk` before deploy (or upload after deploy and redeploy).
2. Set `packages/mobile/app.json`:

```json
"apiUrl": "https://YOUR-APP.onrender.com"
```

3. Run `eas build --platform android --profile preview`.

---

## Optional: Blueprint deploy

A [`render.yaml`](../../render.yaml) is included at the repo root. In Render: **New → Blueprint** and point at this repo to apply the same settings.
