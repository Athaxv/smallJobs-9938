import { db } from "../database";
import * as schema from "../database/schema";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { isPostActive } from "./post-expiry";
import { getConversationForHelper } from "./post-viewer";

type PostRow = typeof schema.posts.$inferSelect;

export function isNavigablePost(post: {
  type?: string | null;
  lat?: number | null;
  lng?: number | null;
}): boolean {
  return post.type !== "remote" && post.lat != null && post.lng != null;
}

export function isActiveLocalHelp(
  response: { status: string; arrivedAt?: Date | null },
  post: PostRow,
): boolean {
  if (response.status !== "accepted") return false;
  if (!isNavigablePost(post)) return false;
  if (response.arrivedAt != null) return false;
  return isPostActive(post);
}

export interface ActiveLocalHelp {
  responseId: string;
  conversationId?: string;
  post: PostRow;
  arrivedAt: null;
}

export async function getActiveLocalHelp(userId: string): Promise<ActiveLocalHelp | null> {
  const rows = await db
    .select({ response: schema.responses, post: schema.posts })
    .from(schema.responses)
    .innerJoin(schema.posts, eq(schema.responses.postId, schema.posts.id))
    .where(
      and(
        eq(schema.responses.userId, userId),
        eq(schema.responses.status, "accepted"),
        isNull(schema.responses.arrivedAt),
      ),
    )
    .orderBy(desc(schema.responses.createdAt))
    .limit(20);

  for (const row of rows) {
    if (isActiveLocalHelp(row.response, row.post)) {
      const conversationId = await getConversationForHelper(row.post.id, userId);
      return {
        responseId: row.response.id,
        conversationId,
        post: row.post,
        arrivedAt: null,
      };
    }
  }

  return null;
}

export async function hasActiveLocalHelp(userId: string): Promise<boolean> {
  const active = await getActiveLocalHelp(userId);
  return active != null;
}

export async function getConversationForUserOnPost(
  postId: string,
  userId: string,
): Promise<string | undefined> {
  const byHelper = await getConversationForHelper(postId, userId);
  if (byHelper) return byHelper;

  const [conversation] = await db
    .select({ id: schema.conversations.id })
    .from(schema.conversations)
    .where(
      and(
        eq(schema.conversations.postId, postId),
        or(
          eq(schema.conversations.user1Id, userId),
          eq(schema.conversations.user2Id, userId),
        ),
      ),
    );
  return conversation?.id;
}
