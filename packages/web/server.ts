import { fileURLToPath } from "node:url";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Load repo-root .env when running locally (Render injects env vars directly). */
function loadLocalEnv() {
  if (process.env.DATABASE_URL) return;
  const envPath = path.resolve(__dirname, "../../.env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

const { default: api } = await import("./src/api/index.ts");

const distDir = path.join(__dirname, "dist");

if (!existsSync(distDir)) {
  console.error(
    "[server] dist/ not found. Run `bun run build` in packages/web before starting.",
  );
  process.exit(1);
}

const app = new Hono();

app.route("/", api);

app.use("*", async (c, next) => {
  if (c.req.path.startsWith("/api")) {
    return next();
  }
  return serveStatic({ root: distDir })(c, next);
});

app.get("*", async (c, next) => {
  if (c.req.path.startsWith("/api")) {
    return next();
  }
  return serveStatic({ root: distDir, path: "index.html" })(c, next);
});

const port = Number(process.env.PORT) || 4200;

console.log(`[server] SmallJobs listening on port ${port}`);
console.log(`[server] API health: http://localhost:${port}/api/health`);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`[server] Ready at http://localhost:${info.port}`);
  },
);
