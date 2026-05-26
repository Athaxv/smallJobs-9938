import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../database';
import * as schema from '../database/schema';
import { eq, desc, and, inArray, sql } from 'drizzle-orm';
import { authMiddleware, requireAuth } from '../middleware/auth';
import type { auth } from '../auth';
import { CATEGORY_IDS, normalizeCategory } from '../../shared/categories';
import { notifyNewPost } from '../services/notify-new-post';
import {
  activeOpenPostsCondition,
  expireStalePosts,
  isUrgency,
  resolveExpiresAtInput,
  urgentFirstOrder,
  type Urgency,
} from '../lib/post-expiry';

type User = typeof auth.$Infer.Session.user;
type Session = typeof auth.$Infer.Session.session;
type Variables = { user: User | null; session: Session | null };

type PostRow = typeof schema.posts.$inferSelect;

function parseTags(raw: string | null | undefined): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : null;
  } catch {
    return null;
  }
}

function serializePost(post: PostRow) {
  return {
    ...post,
    category: normalizeCategory(post.category),
    tags: parseTags(post.tags),
  };
}

const createPostSchema = z.object({
  title: z.string().min(3).max(120),
  body: z.string().min(5).max(600),
  category: z.enum(CATEGORY_IDS),
  type: z.enum(['local', 'remote', 'interest']),
  isPaid: z.boolean(),
  amount: z.number().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  urgency: z.enum(['asap', 'today', 'this_week', 'flexible']).optional(),
  expiresAt: z.string().optional(),
  location: z.string().optional(),
  tags: z.array(z.string()).optional(),
  visibility: z.string().optional(),
});

export const postRoutes = new Hono<{ Variables: Variables }>()
  .use('*', authMiddleware)

  .post('/', requireAuth, zValidator('json', createPostSchema), async (c) => {
    const user = c.get('user') as User;
    const body = c.req.valid('json');

    const urgency: Urgency = body.urgency && isUrgency(body.urgency) ? body.urgency : 'today';
    const expiresAt = resolveExpiresAtInput({
      expiresAt: body.expiresAt ?? null,
      urgency,
    });

    const [post] = await db
      .insert(schema.posts)
      .values({
        userId: user.id,
        title: body.title,
        body: body.body,
        category: normalizeCategory(body.category),
        type: body.type,
        isPaid: body.isPaid,
        amount: body.amount ?? null,
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        tags: body.tags?.length ? JSON.stringify(body.tags) : null,
        status: 'open',
        urgency,
        expiresAt,
        responseCount: 0,
      })
      .returning();

    void notifyNewPost({ post, authorName: user.name ?? 'Someone' }).catch(
      (err) => console.error('[notify-new-post]', err),
    );

    return c.json({ ok: true, post: serializePost(post) }, 201);
  })

  .get(
    '/',
    zValidator('query', z.object({
      category: z.string().optional(),
      type: z.enum(['local', 'remote', 'interest']).optional(),
      urgency: z.enum(['asap', 'today', 'this_week', 'flexible']).optional(),
      page: z.coerce.number().default(1),
      limit: z.coerce.number().max(50).default(20),
    })),
    async (c) => {
      await expireStalePosts();

      const { category, type, urgency, page, limit } = c.req.valid('query');
      const offset = (page - 1) * limit;

      const filters = [activeOpenPostsCondition()];
      if (category) filters.push(eq(schema.posts.category, normalizeCategory(category)));
      if (type) filters.push(eq(schema.posts.type, type));
      if (urgency) filters.push(eq(schema.posts.urgency, urgency));

      const postsResult = await db
        .select({
          post: schema.posts,
          profile: {
            id: schema.profiles.id,
            userId: schema.profiles.userId,
            avatar: schema.profiles.avatar,
            location: schema.profiles.location,
            rating: schema.profiles.rating,
          },
        })
        .from(schema.posts)
        .leftJoin(schema.profiles, eq(schema.posts.userId, schema.profiles.userId))
        .where(and(...filters))
        .orderBy(urgentFirstOrder, desc(schema.posts.createdAt))
        .limit(limit)
        .offset(offset);

      const userIds = [...new Set(postsResult.map(r => r.post.userId))];
      const authUsers = userIds.length > 0
        ? await db
            .select({ id: schema.user.id, name: schema.user.name })
            .from(schema.user)
            .where(inArray(schema.user.id, userIds))
        : [];

      const userMap = Object.fromEntries(authUsers.map(u => [u.id, u]));

      const posts = postsResult.map(r => ({
        ...serializePost(r.post),
        author: {
          userId: r.post.userId,
          name: userMap[r.post.userId]?.name ?? 'User',
          avatar: r.profile?.avatar ?? null,
          location: r.profile?.location ?? null,
          rating: r.profile?.rating ?? 0,
        },
      }));

      return c.json({ ok: true, posts, page, limit }, 200);
    },
  )

  .get(
    '/nearby',
    zValidator('query', z.object({
      lat: z.coerce.number(),
      lng: z.coerce.number(),
      radius: z.coerce.number().max(50).default(10),
      category: z.string().optional(),
      urgency: z.enum(['asap', 'today', 'this_week', 'flexible']).optional(),
      limit: z.coerce.number().max(100).default(50),
    })),
    async (c) => {
      await expireStalePosts();

      const { lat, lng, radius, category, urgency, limit } = c.req.valid('query');
      const now = Date.now();
      const legacyCutoff = now - 24 * 60 * 60 * 1000;

      const latDelta = radius / 111.0;
      const lngDelta = radius / (111.0 * Math.cos(lat * Math.PI / 180));

      const latMin = lat - latDelta;
      const latMax = lat + latDelta;
      const lngMin = lng - lngDelta;
      const lngMax = lng + lngDelta;

      const normalizedCat = category && category !== 'all' ? normalizeCategory(category) : null;
      const catFilter = normalizedCat ? `AND p.category = '${normalizedCat.replace(/'/g, "''")}'` : '';
      const urgencyFilter = urgency ? `AND p.urgency = '${urgency.replace(/'/g, "''")}'` : '';

      const rawSql = sql`
        SELECT p.id, p.user_id, p.title, p.body, p.category, p.type, p.is_paid, p.amount,
               p.distance, p.status, p.urgency, p.expires_at, p.response_count, p.created_at, p.lat, p.lng,
               pr.user_id as profile_user_id, pr.avatar, pr.location as profile_location, pr.rating
        FROM posts p
        LEFT JOIN profiles pr ON p.user_id = pr.user_id
        WHERE p.status = 'open'
          AND (
            (p.expires_at IS NOT NULL AND p.expires_at > ${now})
            OR (p.expires_at IS NULL AND p.created_at > ${legacyCutoff})
          )
          AND p.lat IS NOT NULL
          AND p.lng IS NOT NULL
          AND p.lat BETWEEN ${latMin} AND ${latMax}
          AND p.lng BETWEEN ${lngMin} AND ${lngMax}
          ${sql.raw(catFilter)}
          ${sql.raw(urgencyFilter)}
        ORDER BY CASE WHEN p.urgency = 'asap' THEN 0 ELSE 1 END, p.created_at DESC
        LIMIT ${limit}
      `;

      const rawResult = await db.run(rawSql);
      const rawPosts = (rawResult.rows as unknown as unknown[][]).map(r => ({
        post: {
          id: r[0] as string, userId: r[1] as string, title: r[2] as string, body: r[3] as string,
          category: normalizeCategory(r[4] as string),
          type: (r[5] as string) as 'local' | 'remote' | 'interest',
          isPaid: !!(r[6] as number), amount: r[7] as number | null, distance: r[8] as string | null,
          status: r[9] as string, urgency: r[10] as string, expiresAt: r[11] as number | null,
          responseCount: r[12] as number, createdAt: r[13] as number,
          lat: r[14] as number, lng: r[15] as number,
        },
        profile: {
          userId: r[16] as string | null, avatar: r[17] as string | null,
          location: r[18] as string | null, rating: (r[19] as number | null) ?? 0,
        },
      }));

      const R = 6371;
      const toRad = (d: number) => (d * Math.PI) / 180;
      const haversine = (pLat: number, pLng: number) => {
        const dLat = toRad(pLat - lat);
        const dLng = toRad(pLng - lng);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat)) * Math.cos(toRad(pLat)) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };

      const nearby = rawPosts
        .filter(r => r.post.lat != null && r.post.lng != null && haversine(r.post.lat!, r.post.lng!) <= radius)
        .map(r => {
          const dist = haversine(r.post.lat!, r.post.lng!);
          const fuzzLat = r.post.lat! + (Math.random() - 0.5) * 0.0005;
          const fuzzLng = r.post.lng! + (Math.random() - 0.5) * 0.0005;
          return {
            id: r.post.id,
            title: r.post.title,
            category: r.post.category,
            type: r.post.type,
            isPaid: r.post.isPaid,
            amount: r.post.amount,
            status: r.post.status,
            urgency: r.post.urgency,
            expiresAt: r.post.expiresAt,
            responseCount: r.post.responseCount,
            createdAt: r.post.createdAt,
            lat: fuzzLat,
            lng: fuzzLng,
            distanceKm: Math.round(dist * 10) / 10,
            author: {
              userId: r.post.userId,
              avatar: r.profile?.avatar ?? null,
              location: r.profile?.location ?? null,
              rating: r.profile?.rating ?? 0,
            },
          };
        })
        .sort((a, b) => {
          const aUrgent = a.urgency === 'asap' ? 0 : 1;
          const bUrgent = b.urgency === 'asap' ? 0 : 1;
          if (aUrgent !== bUrgent) return aUrgent - bUrgent;
          return a.distanceKm - b.distanceKm;
        });

      const userIds = [...new Set(nearby.map(p => p.author.userId))];
      const authUsers = userIds.length > 0
        ? await db.select({ id: schema.user.id, name: schema.user.name }).from(schema.user).where(inArray(schema.user.id, userIds))
        : [];
      const userMap = Object.fromEntries(authUsers.map(u => [u.id, u]));
      const posts = nearby.map(p => ({ ...p, author: { ...p.author, name: userMap[p.author.userId]?.name ?? 'User' } }));

      return c.json({ ok: true, posts, count: posts.length, center: { lat, lng }, radius }, 200);
    },
  )

  .patch('/:id/close', requireAuth, async (c) => {
    const user = c.get('user') as User;
    const { id } = c.req.param();

    const [post] = await db.select().from(schema.posts).where(eq(schema.posts.id, id));
    if (!post) return c.json({ message: 'Not found' }, 404);
    if (post.userId !== user.id) return c.json({ message: 'Forbidden' }, 403);
    if (post.status !== 'open') return c.json({ message: 'Post is not open' }, 400);

    const [updated] = await db
      .update(schema.posts)
      .set({ status: 'closed', closedAt: new Date() })
      .where(eq(schema.posts.id, id))
      .returning();

    return c.json({ ok: true, post: serializePost(updated) }, 200);
  })

  .get('/:id', async (c) => {
    await expireStalePosts();

    const { id } = c.req.param();

    const [result] = await db
      .select({
        post: schema.posts,
        profile: {
          userId: schema.profiles.userId,
          avatar: schema.profiles.avatar,
          location: schema.profiles.location,
          rating: schema.profiles.rating,
          ratingCount: schema.profiles.ratingCount,
        },
      })
      .from(schema.posts)
      .leftJoin(schema.profiles, eq(schema.posts.userId, schema.profiles.userId))
      .where(eq(schema.posts.id, id));

    if (!result) return c.json({ message: 'Not found' }, 404);

    const [authUser] = await db
      .select({ id: schema.user.id, name: schema.user.name })
      .from(schema.user)
      .where(eq(schema.user.id, result.post.userId));

    return c.json({
      ok: true,
      post: {
        ...serializePost(result.post),
        author: {
          userId: result.post.userId,
          name: authUser?.name ?? 'User',
          avatar: result.profile?.avatar ?? null,
          location: result.profile?.location ?? null,
          rating: result.profile?.rating ?? 0,
          ratingCount: result.profile?.ratingCount ?? 0,
        },
      },
    }, 200);
  });
