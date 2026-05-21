import { createMiddleware } from "hono/factory";
import { verifyToken } from "../lib/jwt";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

/** Reads Bearer token from Authorization header, verifies JWT, sets c.var.user */
export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    c.set("user", null);
    c.set("session", null);
    return next();
  }

  const payload = await verifyToken(token);
  if (!payload) {
    c.set("user", null);
    c.set("session", null);
    return next();
  }

  c.set("user", { id: payload.sub, name: payload.name, email: payload.email });
  c.set("session", null); // unused — kept for type compat
  return next();
});

/** 401 if no valid user on context */
export const requireAuth = createMiddleware(async (c, next) => {
  if (!c.get("user")) return c.json({ message: "Unauthorized" }, 401);
  return next();
});
