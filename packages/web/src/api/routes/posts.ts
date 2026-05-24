import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../database';
import * as schema from '../database/schema';
import { eq, desc, and, inArray, sql } from 'drizzle-orm';
import { authMiddleware, requireAuth } from '../middleware/auth';
import type { auth } from '../auth';
import { CATEGORY_IDS, normalizeCategory } from '../../shared/categories';

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
  location: z.string().optional(),
  tags: z.array(z.string()).optional(),
  visibility: z.string().optional(),
});

export const postRoutes = new Hono<{ Variables: Variables }>()
  .use('*', authMiddleware)

  // POST /api/posts — create a post
  .post('/', requireAuth, zValidator('json', createPostSchema), async (c) => {
    const user = c.get('user') as User;
    const body = c.req.valid('json');

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
        responseCount: 0,
      })
      .returning();

    return c.json({ ok: true, post: serializePost(post) }, 201);
  })

  // GET /api/posts — feed with optional filters + pagination
  .get(
    '/',
    zValidator('query', z.object({
      category: z.string().optional(),
      type: z.enum(['local', 'remote', 'interest']).optional(),
      urgency: z.string().optional(),
      page: z.coerce.number().default(1),
      limit: z.coerce.number().max(50).default(20),
    })),
    async (c) => {
      const { category, type, page, limit } = c.req.valid('query');
      const offset = (page - 1) * limit;

      const filters = [];
      if (category) filters.push(eq(schema.posts.category, normalizeCategory(category)));
      if (type) filters.push(eq(schema.posts.type, type));
      filters.push(eq(schema.posts.status, 'open'));

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
        .orderBy(desc(schema.posts.createdAt))
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
    }
  )

  // GET /api/posts/nearby — posts near given coords within radius
  .get(
    '/nearby',
    zValidator('query', z.object({
      lat: z.coerce.number(),
      lng: z.coerce.number(),
      radius: z.coerce.number().max(50).default(10),
      category: z.string().optional(),
      urgency: z.string().optional(),
      limit: z.coerce.number().max(100).default(50),
    })),
    async (c) => {
      const { lat, lng, radius, category, limit } = c.req.valid('query');

      const latDelta = radius / 111.0;
      const lngDelta = radius / (111.0 * Math.cos(lat * Math.PI / 180));

      const latMin = lat - latDelta;
      const latMax = lat + latDelta;
      const lngMin = lng - lngDelta;
      const lngMax = lng + lngDelta;

      const normalizedCat = category && category !== 'all' ? normalizeCategory(category) : null;
      const catFilter = normalizedCat ? `AND p.category = '${normalizedCat.replace(/'/g, "''")}'` : '';
      const rawSql = sql`
        SELECT p.id, p.user_id, p.title, p.body, p.category, p.type, p.is_paid, p.amount,
               p.distance, p.status, p.response_count, p.created_at, p.lat, p.lng,
               pr.user_id as profile_user_id, pr.avatar, pr.location as profile_location, pr.rating
        FROM posts p
        LEFT JOIN profiles pr ON p.user_id = pr.user_id
        WHERE p.status = 'open'
          AND p.lat IS NOT NULL
          AND p.lng IS NOT NULL
          AND p.lat BETWEEN ${latMin} AND ${latMax}
          AND p.lng BETWEEN ${lngMin} AND ${lngMax}
          ${sql.raw(catFilter)}
        ORDER BY p.created_at DESC
        LIMIT ${limit}
      `;

      const rawResult = await db.run(rawSql);
      const rawPosts = (rawResult.rows as unknown as unknown[][]).map(r => ({
        post: {
          id: r[0] as string, userId: r[1] as string, title: r[2] as string, body: r[3] as string,
          category: normalizeCategory(r[4] as string),
          type: (r[5] as string) as 'local' | 'remote' | 'interest',
          isPaid: !!(r[6] as number), amount: r[7] as number | null, distance: r[8] as string | null,
          status: r[9] as string, responseCount: r[10] as number, createdAt: r[11] as number,
          lat: r[12] as number, lng: r[13] as number,
        },
        profile: {
          userId: r[14] as string | null, avatar: r[15] as string | null,
          location: r[16] as string | null, rating: (r[17] as number | null) ?? 0,
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
        .sort((a, b) => a.distanceKm - b.distanceKm);

      const userIds = [...new Set(nearby.map(p => p.author.userId))];
      const authUsers = userIds.length > 0
        ? await db.select({ id: schema.user.id, name: schema.user.name }).from(schema.user).where(inArray(schema.user.id, userIds))
        : [];
      const userMap = Object.fromEntries(authUsers.map(u => [u.id, u]));
      const posts = nearby.map(p => ({ ...p, author: { ...p.author, name: userMap[p.author.userId]?.name ?? 'User' } }));

      return c.json({ ok: true, posts, count: posts.length, center: { lat, lng }, radius }, 200);
    }
  )

  // GET /api/posts/:id — single post with author + response count
  .get('/:id', async (c) => {
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
