const LEGACY_DEFAULT_MS = 24 * 60 * 60 * 1000;

export type PostDisplayStatus = "open" | "closed" | "expired";

function toMs(value: string | number | Date | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

/** Whether a post should appear in public feeds (open and not past expiry). */
export function isPostFeedVisible(post: {
  status: string;
  expiresAt?: string | number | null;
  createdAt?: string | number | null;
}): boolean {
  if (post.status !== "open") return false;
  const now = Date.now();
  const expiresAt = toMs(post.expiresAt);
  if (expiresAt != null) return expiresAt > now;
  const createdAt = toMs(post.createdAt) ?? now;
  return createdAt + LEGACY_DEFAULT_MS > now;
}

/** Effective status for profile/history UI (accounts for past expiresAt even if DB still says open). */
export function getPostDisplayStatus(post: {
  status: string;
  expiresAt?: string | number | null;
  createdAt?: string | number | null;
}): PostDisplayStatus {
  if (post.status === "closed") return "closed";
  if (post.status === "expired") return "expired";
  if (!isPostFeedVisible(post)) return "expired";
  return "open";
}
