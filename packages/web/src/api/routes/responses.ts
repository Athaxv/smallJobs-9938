import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../database';
import * as schema from '../database/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { authMiddleware, requireAuth } from '../middleware/auth';
import type { auth } from '../auth';
import { isPostActive } from '../lib/post-expiry';

type User = typeof auth.$Infer.Session.user;
type Session = typeof auth.$Infer.Session.session;
type Variables = { user: User | null; session: Session | null };

export const responseRoutes = new Hono<{ Variables: Variables }>()
  .use('*', authMiddleware)

  // POST /api/responses — respond to a post
  .post(
    '/',
    requireAuth,
    zValidator('json', z.object({
      postId: z.string().min(1),
      message: z.string().min(1).max(500),
    })),
    async (c) => {
      const user = c.get('user') as User;
      const { postId, message } = c.req.valid('json');

      // Verify post exists
      const [post] = await db
        .select()
        .from(schema.posts)
        .where(eq(schema.posts.id, postId));
      if (!post) return c.json({ message: 'Post not found' }, 404);

      if (!isPostActive(post)) {
        return c.json({ message: 'This post is no longer accepting responses' }, 400);
      }

      // Prevent author from responding to own post
      if (post.userId === user.id) {
        return c.json({ message: 'Cannot respond to your own post' }, 400);
      }

      // Prevent duplicate responses
      const [existing] = await db
        .select()
        .from(schema.responses)
        .where(and(eq(schema.responses.postId, postId), eq(schema.responses.userId, user.id)));
      if (existing) return c.json({ message: 'Already responded' }, 409);

      const [response] = await db
        .insert(schema.responses)
        .values({ postId, userId: user.id, message, status: 'accepted' })
        .returning();

      // Increment responseCount on post
      await db
        .update(schema.posts)
        .set({ responseCount: (post.responseCount ?? 0) + 1 })
        .where(eq(schema.posts.id, postId));

      // Create conversation immediately (or reuse existing)
      let conv: typeof schema.conversations.$inferSelect | undefined;
      const [existingConv] = await db
        .select()
        .from(schema.conversations)
        .where(
          and(
            eq(schema.conversations.postId, postId),
            eq(schema.conversations.user2Id, user.id),
          )
        );

      if (existingConv) {
        conv = existingConv;
      } else {
        const openingMsg = `Hi! ${user.name} is interested in your post and wants to connect.`;
        [conv] = await db
          .insert(schema.conversations)
          .values({
            postId,
            user1Id: post.userId,
            user2Id: user.id,
            lastMessage: openingMsg,
            lastMessageAt: new Date(),
          })
          .returning();

        // Send opening message from the responder
        await db
          .insert(schema.messages)
          .values({
            conversationId: conv.id,
            senderId: user.id,
            body: openingMsg,
          });
      }

      return c.json({ ok: true, response, conversationId: conv.id }, 201);
    }
  )

  // GET /api/responses/post/:postId — get responses for a post (author only)
  .get('/post/:postId', requireAuth, async (c) => {
    const user = c.get('user') as User;
    const { postId } = c.req.param();

    const [post] = await db
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.id, postId));
    if (!post) return c.json({ message: 'Not found' }, 404);
    if (post.userId !== user.id) return c.json({ message: 'Forbidden' }, 403);

    const responseList = await db
      .select()
      .from(schema.responses)
      .where(eq(schema.responses.postId, postId));

    const userIds = [...new Set(responseList.map(r => r.userId))];
    const authUsers = userIds.length > 0
      ? await db
          .select({ id: schema.user.id, name: schema.user.name })
          .from(schema.user)
          .where(inArray(schema.user.id, userIds))
      : [];
    const profiles = userIds.length > 0
      ? await db
          .select()
          .from(schema.profiles)
          .where(inArray(schema.profiles.userId, userIds))
      : [];

    const userMap = Object.fromEntries(authUsers.map(u => [u.id, u]));
    const profileMap = Object.fromEntries(profiles.map(p => [p.userId, p]));

    const enriched = responseList.map(r => ({
      ...r,
      responder: {
        userId: r.userId,
        name: userMap[r.userId]?.name ?? 'User',
        avatar: profileMap[r.userId]?.avatar ?? null,
        rating: profileMap[r.userId]?.rating ?? 0,
      },
    }));

    return c.json({ ok: true, responses: enriched }, 200);
  })

  // PATCH /api/responses/:id/accept — accept a response → create conversation
  .patch('/:id/accept', requireAuth, async (c) => {
    const user = c.get('user') as User;
    const { id } = c.req.param();

    const [response] = await db
      .select()
      .from(schema.responses)
      .where(eq(schema.responses.id, id));
    if (!response) return c.json({ message: 'Not found' }, 404);

    const [post] = await db
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.id, response.postId));
    if (!post || post.userId !== user.id) return c.json({ message: 'Forbidden' }, 403);

    // Update response status
    await db
      .update(schema.responses)
      .set({ status: 'accepted' })
      .where(eq(schema.responses.id, id));

    // Check if conversation already exists
    const [existingConv] = await db
      .select()
      .from(schema.conversations)
      .where(
        and(
          eq(schema.conversations.postId, response.postId),
          eq(schema.conversations.user2Id, response.userId),
        )
      );

    if (existingConv) {
      return c.json({ ok: true, conversationId: existingConv.id }, 200);
    }

    const [conv] = await db
      .insert(schema.conversations)
      .values({
        postId: response.postId,
        user1Id: user.id,        // post author
        user2Id: response.userId, // responder
      })
      .returning();

    return c.json({ ok: true, conversationId: conv.id }, 201);
  });
