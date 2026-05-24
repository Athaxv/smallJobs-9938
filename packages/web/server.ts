import { fileURLToPath } from "node:url";
import path from "node:path";
import { existsSync } from "node:fs";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import api from "./src/api/index.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");

if (!existsSync(distDir)) {
  console.error(
    "[server] dist/ not found. Run `bun run build` in packages/web before starting.",
  );
  process.exit(1);
}

const app = new Hono();

// Hono API — routes are under /api (see src/api/index.ts basePath)
app.route("/", api);

// Static files + SPA (skip /api)
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
