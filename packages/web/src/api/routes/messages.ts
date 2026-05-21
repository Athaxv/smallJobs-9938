import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../database';
import * as schema from '../database/schema';
import { eq, and, asc, desc, or } from 'drizzle-orm';
import { authMiddleware, requireAuth } from '../middleware/auth';
import type { auth } from '../auth';

type User = typeof auth.$Infer.Session.user;
type Session = typeof auth.$Infer.Session.session;
type Variables = { user: User | null; session: Session | null };

export const messageRoutes = new Hono<{ Variables: Variables }>()
  .use('*', authMiddleware)
  .use('*', requireAuth)

  // GET /api/messages/conversations — list my conversations
  .get('/conversations', async (c) => {
    const user = c.get('user') as User;

    const convs = await db
      .select()
      .from(schema.conversations)
      .where(
        or(
          eq(schema.conversations.user1Id, user.id),
          eq(schema.conversations.user2Id, user.id),
        )
      )
      .orderBy(desc(schema.conversations.lastMessageAt));

    // Enrich with post title + other user info
    const postIds = [...new Set(convs.map(c => c.postId))];
    const posts = postIds.length > 0
      ? await db
          .select({ id: schema.posts.id, title: schema.posts.title })
          .from(schema.posts)
          .where(eq(schema.posts.id, postIds[0])) // Drizzle inArray workaround below
      : [];

    // Get all posts at once using multiple queries (simple approach)
    const postMap: Record<string, string> = {};
    for (const pid of postIds) {
      const [p] = await db.select({ id: schema.posts.id, title: schema.posts.title }).from(schema.posts).where(eq(schema.posts.id, pid));
      if (p) postMap[p.id] = p.title;
    }

    // Get other user info
    const otherUserIds = convs.map(c => c.user1Id === user.id ? c.user2Id : c.user1Id);
    const uniqueOtherIds = [...new Set(otherUserIds)];
    const otherUsers: Record<string, { name: string; avatar: string | null }> = {};
    for (const uid of uniqueOtherIds) {
      const [u] = await db.select({ id: schema.user.id, name: schema.user.name }).from(schema.user).where(eq(schema.user.id, uid));
      const [p] = await db.select({ avatar: schema.profiles.avatar }).from(schema.profiles).where(eq(schema.profiles.userId, uid));
      otherUsers[uid] = { name: u?.name ?? 'User', avatar: p?.avatar ?? null };
    }

    // Count unread messages per conversation
    const enriched = await Promise.all(convs.map(async (conv) => {
      const otherId = conv.user1Id === user.id ? conv.user2Id : conv.user1Id;
      const [unreadRow] = await db
        .select({ count: schema.messages.id })
        .from(schema.messages)
        .where(
          and(
            eq(schema.messages.conversationId, conv.id),
            eq(schema.messages.senderId, otherId),
            eq(schema.messages.read, false),
          )
        );

      return {
        ...conv,
        postTitle: postMap[conv.postId] ?? 'Thread',
        otherUser: otherUsers[otherId] ?? { name: 'User', avatar: null },
        unreadCount: unreadRow ? 1 : 0, // simplified: 1 = has unread
      };
    }));

    return c.json({ ok: true, conversations: enriched }, 200);
  })

  // GET /api/messages/conversations/:id — get messages in a conversation
  .get(
    '/conversations/:id',
    zValidator('query', z.object({
      page: z.coerce.number().default(1),
      limit: z.coerce.number().max(100).default(50),
    })),
    async (c) => {
      const user = c.get('user') as User;
      const { id } = c.req.param();
      const { page, limit } = c.req.valid('query');

      // Verify user is part of this conversation
      const [conv] = await db
        .select()
        .from(schema.conversations)
        .where(eq(schema.conversations.id, id));
      if (!conv) return c.json({ message: 'Not found' }, 404);
      if (conv.user1Id !== user.id && conv.user2Id !== user.id) {
        return c.json({ message: 'Forbidden' }, 403);
      }

      const offset = (page - 1) * limit;
      const msgs = await db
        .select()
        .from(schema.messages)
        .where(eq(schema.messages.conversationId, id))
        .orderBy(asc(schema.messages.createdAt))
        .limit(limit)
        .offset(offset);

      // Mark messages from other user as read
      const otherId = conv.user1Id === user.id ? conv.user2Id : conv.user1Id;
      await db
        .update(schema.messages)
        .set({ read: true })
        .where(
          and(
            eq(schema.messages.conversationId, id),
            eq(schema.messages.senderId, otherId),
            eq(schema.messages.read, false),
          )
        );

      return c.json({ ok: true, messages: msgs, conversationId: id }, 200);
    }
  )

  // POST /api/messages/conversations/:id — send a message
  .post(
    '/conversations/:id',
    zValidator('json', z.object({ body: z.string().min(1).max(1000) })),
    async (c) => {
      const user = c.get('user') as User;
      const { id } = c.req.param();
      const { body } = c.req.valid('json');

      const [conv] = await db
        .select()
        .from(schema.conversations)
        .where(eq(schema.conversations.id, id));
      if (!conv) return c.json({ message: 'Not found' }, 404);
      if (conv.user1Id !== user.id && conv.user2Id !== user.id) {
        return c.json({ message: 'Forbidden' }, 403);
      }

      const [msg] = await db
        .insert(schema.messages)
        .values({ conversationId: id, senderId: user.id, body, read: false })
        .returning();

      // Update conversation's last message
      await db
        .update(schema.conversations)
        .set({ lastMessage: body, lastMessageAt: new Date() })
        .where(eq(schema.conversations.id, id));

      return c.json({ ok: true, message: msg }, 201);
    }
  );
