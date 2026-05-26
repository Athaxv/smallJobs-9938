import { db } from "../database";
import * as schema from "../database/schema";
import { and, eq } from "drizzle-orm";
import {
  getActiveLocalHelp,
  getConversationForUserOnPost,
  isNavigablePost,
} from "./active-help";

export interface BlockedByActiveHelp {
  postId: string;
  postTitle: string;
  conversationId?: string;
  responseId: string;
  lat?: number | null;
  lng?: number | null;
  category?: string;
  type?: string;
}

export interface PostViewerState {
  hasResponded: boolean;
  conversationId?: string;
  responseId?: string;
  arrivedAt?: string | null;
  blockedByActiveHelp?: BlockedByActiveHelp;
}

export async function getPostViewerState(
  postId: string,
  userId: string,
): Promise<PostViewerState> {
  const [response] = await db
    .select()
    .from(schema.responses)
    .where(and(eq(schema.responses.postId, postId), eq(schema.responses.userId, userId)));

  const [post] = await db
    .select()
    .from(schema.posts)
    .where(eq(schema.posts.id, postId));

  let blockedByActiveHelp: BlockedByActiveHelp | undefined;
  if (post && isNavigablePost(post) && !response) {
    const activeHelp = await getActiveLocalHelp(userId);
    if (activeHelp && activeHelp.post.id !== postId) {
      blockedByActiveHelp = {
        postId: activeHelp.post.id,
        postTitle: activeHelp.post.title,
        conversationId: activeHelp.conversationId,
        responseId: activeHelp.responseId,
        lat: activeHelp.post.lat,
        lng: activeHelp.post.lng,
        category: activeHelp.post.category,
        type: activeHelp.post.type,
      };
    }
  }

  if (!response) {
    return {
      hasResponded: false,
      ...(blockedByActiveHelp ? { blockedByActiveHelp } : {}),
    };
  }

  const conversationId = await getConversationForUserOnPost(postId, userId);

  return {
    hasResponded: true,
    responseId: response.id,
    conversationId,
    arrivedAt: response.arrivedAt?.toISOString() ?? null,
    ...(blockedByActiveHelp ? { blockedByActiveHelp } : {}),
  };
}

export async function getConversationForHelper(
  postId: string,
  helperUserId: string,
): Promise<string | undefined> {
  return getConversationForUserOnPost(postId, helperUserId);
}
