import { router } from "expo-router";
import { displayPostTitle } from "./postDisplay";

export interface ExploreRoutePost {
  id: string;
  title: string;
  body?: string;
  category?: string;
  type?: string;
  lat?: number | null;
  lng?: number | null;
}

export function isNavigablePost(post: ExploreRoutePost): boolean {
  return post.type !== "remote" && post.lat != null && post.lng != null;
}

export function buildExploreRouteParams(
  post: ExploreRoutePost,
  conversationId?: string,
): Record<string, string> {
  const headline = displayPostTitle(post.title, post.body, post.category);
  return {
    routePostId: post.id,
    destLat: String(post.lat),
    destLng: String(post.lng),
    destTitle: headline,
    destCategory: post.category ?? "other",
    ...(conversationId ? { conversationId } : {}),
  };
}

export function navigateToExploreRoute(
  post: ExploreRoutePost,
  conversationId?: string,
): void {
  router.push({
    pathname: "/(tabs)/explore",
    params: buildExploreRouteParams(post, conversationId),
  } as any);
}

export function navigateAfterJoin(
  post: ExploreRoutePost,
  conversationId: string,
): void {
  if (isNavigablePost(post)) {
    navigateToExploreRoute(post, conversationId);
  } else {
    router.push(`/chat/${conversationId}` as any);
  }
}
