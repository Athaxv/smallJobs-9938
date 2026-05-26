import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Re-export Better Auth generated tables
export * from "./auth-schema";

// ─── Profiles ────────────────────────────────────────────────────────────────
// One per user. Created automatically on first sign-up.
export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().unique(),           // FK → auth user.id
  bio: text("bio"),
  avatar: text("avatar"),                               // URL or initials fallback
  location: text("location"),
  lat: real("lat"),
  lng: real("lng"),
  notifyNearby: integer("notify_nearby", { mode: "boolean" }).default(true).notNull(),
  rating: real("rating").default(0),
  ratingCount: integer("rating_count").default(0),
  isOnboarded: integer("is_onboarded", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

// ─── Posts ────────────────────────────────────────────────────────────────────
export const posts = sqliteTable("posts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  category: text("category").notNull(),
  type: text("type", { enum: ["local", "remote", "interest"] }).notNull().default("local"),
  isPaid: integer("is_paid", { mode: "boolean" }).default(false).notNull(),
  amount: real("amount"),
  distance: text("distance"),                           // e.g. "1.2 km"
  lat: real("lat"),                                     // approximate latitude
  lng: real("lng"),                                     // approximate longitude
  tags: text("tags"),                                   // JSON array of tag strings
  status: text("status", { enum: ["open", "closed", "expired"] }).notNull().default("open"),
  urgency: text("urgency", { enum: ["asap", "today", "this_week", "flexible"] })
    .notNull()
    .default("today"),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
  closedAt: integer("closed_at", { mode: "timestamp_ms" }),
  responseCount: integer("response_count").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

// ─── Push tokens (Expo) ─────────────────────────────────────────────────────
export const pushTokens = sqliteTable("push_tokens", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  token: text("token").notNull().unique(),
  platform: text("platform", { enum: ["ios", "android"] }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

// ─── Responses ────────────────────────────────────────────────────────────────
export const responses = sqliteTable("responses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  postId: text("post_id").notNull(),
  userId: text("user_id").notNull(),
  message: text("message").notNull(),
  status: text("status", { enum: ["pending", "accepted", "rejected"] }).notNull().default("pending"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

// ─── Conversations ─────────────────────────────────────────────────────────────
export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  postId: text("post_id").notNull(),
  user1Id: text("user1_id").notNull(),                 // post author
  user2Id: text("user2_id").notNull(),                 // responder
  lastMessage: text("last_message"),
  lastMessageAt: integer("last_message_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});

// ─── Messages ─────────────────────────────────────────────────────────────────
export const messages = sqliteTable("messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  conversationId: text("conversation_id").notNull(),
  senderId: text("sender_id").notNull(),
  body: text("body").notNull(),
  read: integer("read", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
});
