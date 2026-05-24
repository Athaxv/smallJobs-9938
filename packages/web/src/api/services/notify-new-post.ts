import { db } from "../database";
import * as schema from "../database/schema";
import { and, eq, ne, isNotNull, inArray } from "drizzle-orm";
import { haversineKm } from "../lib/geo";
import { sendExpoPush, type PushMessage } from "../lib/expo-push";

type PostRow = typeof schema.posts.$inferSelect;

const NEARBY_RADIUS_KM = 5;
const NEARBY_LIMIT = 10;

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

async function findNearestRecipientUserIds(
  lat: number,
  lng: number,
  excludeUserId: string,
): Promise<string[]> {
  const rows = await db
    .select({
      userId: schema.profiles.userId,
      lat: schema.profiles.lat,
      lng: schema.profiles.lng,
    })
    .from(schema.profiles)
    .innerJoin(
      schema.pushTokens,
      eq(schema.pushTokens.userId, schema.profiles.userId),
    )
    .where(
      and(
        eq(schema.profiles.notifyNearby, true),
        ne(schema.profiles.userId, excludeUserId),
        isNotNull(schema.profiles.lat),
        isNotNull(schema.profiles.lng),
      ),
    );

  return rows
    .filter((r) => r.lat != null && r.lng != null)
    .map((r) => ({
      userId: r.userId,
      distance: haversineKm(lat, lng, r.lat!, r.lng!),
    }))
    .filter((r) => r.distance <= NEARBY_RADIUS_KM)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, NEARBY_LIMIT)
    .map((r) => r.userId);
}

async function getTokensForUserIds(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return [];
  const rows = await db
    .select({ token: schema.pushTokens.token })
    .from(schema.pushTokens)
    .where(inArray(schema.pushTokens.userId, userIds));
  return rows.map((r) => r.token);
}

async function getAllPushTokensExcept(excludeUserId: string): Promise<string[]> {
  const rows = await db
    .select({ token: schema.pushTokens.token })
    .from(schema.pushTokens)
    .where(ne(schema.pushTokens.userId, excludeUserId));
  return rows.map((r) => r.token);
}

function buildMessages(
  tokens: string[],
  post: PostRow,
  authorName: string,
): PushMessage[] {
  const isLocal = post.type === "local";
  const title = isLocal ? "New gig nearby" : "New request on SmallJobs";
  const body = truncate(`${authorName}: ${post.title}`, 120);

  return tokens.map((token) => ({
    to: token,
    title,
    body,
    sound: "default" as const,
    data: {
      postId: post.id,
      type: "new_post",
    },
  }));
}

export async function notifyNewPost({
  post,
  authorName,
}: {
  post: PostRow;
  authorName: string;
}): Promise<void> {
  if (post.type === "local") {
    if (post.lat == null || post.lng == null) return;
    const recipientUserIds = await findNearestRecipientUserIds(
      post.lat,
      post.lng,
      post.userId,
    );
    const tokens = await getTokensForUserIds(recipientUserIds);
    await sendExpoPush(buildMessages(tokens, post, authorName));
    return;
  }

  const tokens = await getAllPushTokensExcept(post.userId);
  await sendExpoPush(buildMessages(tokens, post, authorName));
}
