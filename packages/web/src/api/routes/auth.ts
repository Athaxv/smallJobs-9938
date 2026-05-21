import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../database";
import * as schema from "../database/schema";
import { signToken } from "../lib/jwt";
import {
  hashPassword,
  verifyPassword as baVerifyPassword,
} from "better-auth/crypto";

async function checkPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await baVerifyPassword({ hash, password });
  } catch {
    return false;
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

export const authRoutes = new Hono()

  // ── POST /api/auth/login ─────────────────────────────────────────────────
  .post("/login", zValidator("json", loginSchema), async (c) => {
    const { email, password } = c.req.valid("json");

    // Look up user
    const [user] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, email.toLowerCase()));

    if (!user) return c.json({ error: "Invalid email or password" }, 401);

    // Find credential account (email/password type)
    const [account] = await db
      .select()
      .from(schema.account)
      .where(eq(schema.account.userId, user.id));

    if (!account?.password) return c.json({ error: "Invalid email or password" }, 401);

    const valid = await checkPassword(account.password, password);
    if (!valid) return c.json({ error: "Invalid email or password" }, 401);

    const token = await signToken({ sub: user.id, email: user.email, name: user.name });
    return c.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  })

  // ── POST /api/auth/signup ────────────────────────────────────────────────
  .post("/signup", zValidator("json", signupSchema), async (c) => {
    const { name, email, password } = c.req.valid("json");

    // Check duplicate
    const [existing] = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, email.toLowerCase()));
    if (existing) return c.json({ error: "Email already in use" }, 409);

    const hashed = await hashPassword(password);
    const userId = crypto.randomUUID();
    const accountId = crypto.randomUUID();

    // Insert user + credential account in parallel
    const [newUser] = await db
      .insert(schema.user)
      .values({
        id: userId,
        name,
        email: email.toLowerCase(),
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    await db.insert(schema.account).values({
      id: accountId,
      accountId: userId,
      providerId: "credential",
      userId,
      password: hashed,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = await signToken({ sub: newUser.id, email: newUser.email, name: newUser.name });
    return c.json({ token, user: { id: newUser.id, email: newUser.email, name: newUser.name } }, 201);
  })

  // ── POST /api/auth/logout ────────────────────────────────────────────────
  .post("/logout", (c) => c.json({ ok: true }))

  // ── GET /api/auth/me ─────────────────────────────────────────────────────
  .get("/me", async (c) => {
    const authHeader = c.req.header("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return c.json({ user: null }, 401);

    const { verifyToken } = await import("../lib/jwt");
    const payload = await verifyToken(token);
    if (!payload) return c.json({ user: null }, 401);

    const [user] = await db
      .select({ id: schema.user.id, name: schema.user.name, email: schema.user.email })
      .from(schema.user)
      .where(eq(schema.user.id, payload.sub));

    if (!user) return c.json({ user: null }, 401);
    return c.json({ user });
  });
