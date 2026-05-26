import { db } from "../database";
import * as schema from "../database/schema";
import { and, eq, or, isNull, sql, type SQL } from "drizzle-orm";

export type Urgency = "asap" | "today" | "this_week" | "flexible";

const MS = {
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
} as const;

const URGENCY_MS: Record<Urgency, number> = {
  asap: 2 * MS.HOUR,
  today: MS.DAY,
  this_week: 7 * MS.DAY,
  flexible: 3 * MS.DAY,
};

const MIN_EXPIRY_MS = 30 * MS.HOUR / 60;
const MAX_EXPIRY_MS = 30 * MS.DAY;
const LEGACY_DEFAULT_MS = MS.DAY;

export function isUrgency(value: string | undefined | null): value is Urgency {
  return value === "asap" || value === "today" || value === "this_week" || value === "flexible";
}

export function computeExpiresAtFromUrgency(urgency: Urgency, now = Date.now()): Date {
  return new Date(now + URGENCY_MS[urgency]);
}

export function computeDefaultExpiresAt(now = Date.now()): Date {
  return computeExpiresAtFromUrgency("today", now);
}

export function clampExpiresAt(date: Date, now = Date.now()): Date {
  const min = now + MIN_EXPIRY_MS;
  const max = now + MAX_EXPIRY_MS;
  return new Date(Math.max(min, Math.min(date.getTime(), max)));
}

export function resolveExpiresAtInput(input: {
  expiresAt?: string | Date | null;
  urgency?: Urgency | null;
  now?: number;
}): Date {
  const now = input.now ?? Date.now();
  const urgency = input.urgency && isUrgency(input.urgency) ? input.urgency : "today";

  if (input.expiresAt) {
    const parsed = input.expiresAt instanceof Date ? input.expiresAt : new Date(input.expiresAt);
    if (!Number.isNaN(parsed.getTime()) && parsed.getTime() > now) {
      if (urgency === "asap") {
        const maxAsap = now + URGENCY_MS.asap;
        return clampExpiresAt(new Date(Math.min(parsed.getTime(), maxAsap)), now);
      }
      return clampExpiresAt(parsed, now);
    }
  }

  return clampExpiresAt(computeExpiresAtFromUrgency(urgency, now), now);
}

export function getEffectiveExpiresAt(post: {
  expiresAt?: Date | number | null;
  createdAt?: Date | number | null;
}): number {
  if (post.expiresAt != null) {
    return typeof post.expiresAt === "number"
      ? post.expiresAt
      : post.expiresAt.getTime();
  }
  const created =
    post.createdAt == null
      ? Date.now()
      : typeof post.createdAt === "number"
        ? post.createdAt
        : post.createdAt.getTime();
  return created + LEGACY_DEFAULT_MS;
}

export function isPostActive(post: {
  status: string;
  expiresAt?: Date | number | null;
  createdAt?: Date | number | null;
}): boolean {
  if (post.status !== "open") return false;
  return getEffectiveExpiresAt(post) > Date.now();
}

/** SQL filter for feed/map queries — open posts that have not passed their expiry. */
export function activeOpenPostsCondition(now = Date.now()): SQL {
  const legacyCutoff = now - LEGACY_DEFAULT_MS;
  return and(
    eq(schema.posts.status, "open"),
    or(
      and(
        sql`${schema.posts.expiresAt} IS NOT NULL`,
        sql`${schema.posts.expiresAt} > ${now}`,
      ),
      and(
        isNull(schema.posts.expiresAt),
        sql`${schema.posts.createdAt} > ${legacyCutoff}`,
      ),
    ),
  )!;
}

export async function expireStalePosts(): Promise<void> {
  const now = Date.now();
  const legacyCutoff = now - LEGACY_DEFAULT_MS;

  await db
    .update(schema.posts)
    .set({ status: "expired" })
    .where(
      and(
        eq(schema.posts.status, "open"),
        or(
          and(
            sql`${schema.posts.expiresAt} IS NOT NULL`,
            sql`${schema.posts.expiresAt} <= ${now}`,
          ),
          and(
            isNull(schema.posts.expiresAt),
            sql`${schema.posts.createdAt} <= ${legacyCutoff}`,
          ),
        ),
      ),
    );
}

export const urgentFirstOrder = sql`CASE WHEN ${schema.posts.urgency} = 'asap' THEN 0 ELSE 1 END`;
