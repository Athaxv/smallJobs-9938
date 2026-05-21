import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, desc, and, count, sql } from "drizzle-orm";
import { authMiddleware, requireAuth } from "../middleware/auth";
import type { auth } from "../auth";

type User = typeof auth.$Infer.Session.user;
type Session = typeof auth.$Infer.Session.session;
type Variables = { user: User | null; session: Session | null };

const patchProfileSchema = z.object({
  bio: z.string().max(200).optional(),
  avatar: z.string().url().optional().nullable(),
  location: z.string().max(100).optional(),
  isOnboarded: z.boolean().optional(),
  name: z.string().min(1).max(80).optional(),
});

// ── Helper: compute trust summary for a userId ─────────────────────────────
async function computeTrust(userId: string) {
  // Posts created by user
  const [postedResult] = await db
    .select({ count: count() })
    .from(schema.posts)
    .where(eq(schema.posts.userId, userId));
  const posted = postedResult?.count ?? 0;

  // Posts completed (closed) by user
  const [completedResult] = await db
    .select({ count: count() })
    .from(schema.posts)
    .where(and(eq(schema.posts.userId, userId), eq(schema.posts.status, "closed")));
  const completed = completedResult?.count ?? 0;

  // Responses sent by user (how many times they helped)
  const [helpedResult] = await db
    .select({ count: count() })
    .from(schema.responses)
    .where(eq(schema.responses.userId, userId));
  const helped = helpedResult?.count ?? 0;

  // Accepted responses (confirms reliability)
  const [acceptedResult] = await db
    .select({ count: count() })
    .from(schema.responses)
    .where(and(eq(schema.responses.userId, userId), eq(schema.responses.status, "accepted")));
  const accepted = acceptedResult?.count ?? 0;

  // Response rate: accepted / helped
  const responseRate = helped > 0 ? Math.round((accepted / helped) * 100) : null;

  // Derive a trust badge
  let badge: string | null = null;
  if (accepted >= 10) badge = "Trusted Helper";
  else if (accepted >= 5) badge = "Reliable Helper";
  else if (helped >= 3) badge = "Active Member";
  else if (posted >= 1 || helped >= 1) badge = "Getting Started";

  return { posted, completed, helped, accepted, responseRate, badge };
}

export const profileRoutes = new Hono<{ Variables: Variables }>()
  .use("*", authMiddleware)

  // GET /api/profile — current user's full profile + trust
  .get("/", requireAuth, async (c) => {
    const user = c.get("user") as User;

    // Ensure profile exists
    let [profile] = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, user.id));

    if (!profile) {
      [profile] = await db
        .insert(schema.profiles)
        .values({ userId: user.id })
        .returning();
    }

    const trust = await computeTrust(user.id);

    return c.json({ ok: true, profile, user: { id: user.id, name: user.name, email: user.email }, trust }, 200);
  })

  // PATCH /api/profile — update profile + optionally user name
  .patch("/", requireAuth, zValidator("json", patchProfileSchema), async (c) => {
    const user = c.get("user") as User;
    const body = c.req.valid("json");

    const { name, ...profileFields } = body;

    // Update user name if provided
    if (name) {
      await db
        .update(schema.user)
        .set({ name, updatedAt: new Date() })
        .where(eq(schema.user.id, user.id));
    }

    // Upsert profile
    let [profile] = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, user.id));

    if (!profile) {
      [profile] = await db
        .insert(schema.profiles)
        .values({ userId: user.id, ...profileFields, updatedAt: new Date() })
        .returning();
    } else {
      [profile] = await db
        .update(schema.profiles)
        .set({ ...profileFields, updatedAt: new Date() })
        .where(eq(schema.profiles.userId, user.id))
        .returning();
    }

    const resolvedName = name ?? user.name;
    return c.json({ ok: true, profile, user: { id: user.id, name: resolvedName, email: user.email } }, 200);
  })

  // GET /api/profile/my/posts — current user's posts, paginated
  .get("/my/posts", requireAuth, async (c) => {
    const user = c.get("user") as User;
    const page = Number(c.req.query("page") ?? 1);
    const limit = Math.min(Number(c.req.query("limit") ?? 20), 50);
    const status = c.req.query("status") as "open" | "closed" | "expired" | undefined;
    const offset = (page - 1) * limit;

    const filters = [eq(schema.posts.userId, user.id)];
    if (status) filters.push(eq(schema.posts.status, status));

    const posts = await db
      .select()
      .from(schema.posts)
      .where(and(...filters))
      .orderBy(desc(schema.posts.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json({ ok: true, posts, page, limit }, 200);
  })

  // GET /api/profile/my/responses — posts user responded to (helped)
  .get("/my/responses", requireAuth, async (c) => {
    const user = c.get("user") as User;
    const page = Number(c.req.query("page") ?? 1);
    const limit = Math.min(Number(c.req.query("limit") ?? 20), 50);
    const offset = (page - 1) * limit;

    // Join responses → posts
    const rows = await db
      .select({
        response: schema.responses,
        post: schema.posts,
      })
      .from(schema.responses)
      .innerJoin(schema.posts, eq(schema.responses.postId, schema.posts.id))
      .where(eq(schema.responses.userId, user.id))
      .orderBy(desc(schema.responses.createdAt))
      .limit(limit)
      .offset(offset);

    const items = rows.map(r => ({
      responseId: r.response.id,
      responseStatus: r.response.status,
      responseMessage: r.response.message,
      respondedAt: r.response.createdAt,
      post: r.post,
    }));

    return c.json({ ok: true, items, page, limit }, 200);
  })

  // GET /api/profile/my/active — open posts + accepted responses (active tasks)
  .get("/my/active", requireAuth, async (c) => {
    const user = c.get("user") as User;

    // My open posts
    const myOpenPosts = await db
      .select()
      .from(schema.posts)
      .where(and(eq(schema.posts.userId, user.id), eq(schema.posts.status, "open")))
      .orderBy(desc(schema.posts.createdAt))
      .limit(10);

    // Posts I'm helping with (accepted responses)
    const helpingRows = await db
      .select({ response: schema.responses, post: schema.posts })
      .from(schema.responses)
      .innerJoin(schema.posts, eq(schema.responses.postId, schema.posts.id))
      .where(and(eq(schema.responses.userId, user.id), eq(schema.responses.status, "accepted")))
      .orderBy(desc(schema.responses.createdAt))
      .limit(10);

    const helping = helpingRows.map(r => ({
      responseId: r.response.id,
      post: r.post,
    }));

    return c.json({ ok: true, myOpenPosts, helping }, 200);
  })

  // GET /api/profile/:userId — public profile view
  .get("/:userId", async (c) => {
    const { userId } = c.req.param();

    const [profile] = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, userId));

    if (!profile) return c.json({ message: "Not found" }, 404);

    const [authUser] = await db
      .select({ id: schema.user.id, name: schema.user.name })
      .from(schema.user)
      .where(eq(schema.user.id, userId));

    const trust = await computeTrust(userId);

    return c.json({
      ok: true,
      profile,
      user: { id: userId, name: authUser?.name ?? "User" },
      trust,
    }, 200);
  });
