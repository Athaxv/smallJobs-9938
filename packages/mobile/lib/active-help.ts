import { Linking, Platform } from "react-native";
import type { Post } from "./api";
import { isNavigablePost } from "./explore-route";

export interface ActiveHelp {
  responseId: string;
  conversationId?: string;
  post: Post;
}

export function openExternalMapsDirections(
  destLat: number,
  destLng: number,
  label?: string,
): void {
  const encodedLabel = encodeURIComponent(label ?? "Destination");
  const url = Platform.select({
    ios: `maps://?daddr=${destLat},${destLng}&q=${encodedLabel}`,
    android: `google.navigation:q=${destLat},${destLng}`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`,
  });
  if (url) void Linking.openURL(url);
}

export function isActiveHelpNavigable(help: ActiveHelp | null | undefined): boolean {
  return help != null && isNavigablePost(help.post) && help.post.status === "open";
}
