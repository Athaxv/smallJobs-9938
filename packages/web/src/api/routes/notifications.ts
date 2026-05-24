import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware, requireAuth } from "../middleware/auth";
import type { auth } from "../auth";

type User = typeof auth.$Infer.Session.user;
type Session = typeof auth.$Infer.Session.session;
type Variables = { user: User | null; session: Session | null };

const registerTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(["ios", "android"]),
});

const deleteTokenSchema = z.object({
  token: z.string().min(1),
});

export const notificationRoutes = new Hono<{ Variables: Variables }>()
  .use("*", authMiddleware)

  .post(
    "/push-token",
    requireAuth,
    zValidator("json", registerTokenSchema),
    async (c) => {
      const user = c.get("user") as User;
      const { token, platform } = c.req.valid("json");

      const [existing] = await db
        .select()
        .from(schema.pushTokens)
        .where(eq(schema.pushTokens.token, token))
        .limit(1);

      if (existing) {
        await db
          .update(schema.pushTokens)
          .set({ userId: user.id, platform, updatedAt: new Date() })
          .where(eq(schema.pushTokens.token, token));
      } else {
        await db.insert(schema.pushTokens).values({
          userId: user.id,
          token,
          platform,
          updatedAt: new Date(),
        });
      }

      return c.json({ ok: true }, 200);
    },
  )

  .delete(
    "/push-token",
    requireAuth,
    zValidator("json", deleteTokenSchema),
    async (c) => {
      const user = c.get("user") as User;
      const { token } = c.req.valid("json");

      await db
        .delete(schema.pushTokens)
        .where(
          and(
            eq(schema.pushTokens.token, token),
            eq(schema.pushTokens.userId, user.id),
          ),
        );

      return c.json({ ok: true }, 200);
    },
  );
