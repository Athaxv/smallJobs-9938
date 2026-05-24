/**
 * API client — plain fetch with Bearer token, typed responses.
 * Exports:
 *   - `api`         Hono-style RPC object for existing callers
 *   - `profileApi`  Rich profile helpers for the new profile system
 */

import { BASE_URL, getTokenAsync } from "./auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  userId: string;
  bio: string | null;
  avatar: string | null;
  location: string | null;
  rating: number | null;
  ratingCount: number | null;
  isOnboarded: boolean;
  createdAt: number | string;
  updatedAt: number | string;
}

export interface PublicUser {
  id: string;
  name: string;
  email?: string;
}

export interface TrustSummary {
  posted: number;
  completed: number;
  helped: number;
  accepted: number;
  responseRate: number | null;
  badge: string | null;
}

export interface Post {
  id: string;
  userId: string;
  title: string;
  body: string;
  category: string;
  type: "local" | "remote" | "interest";
  isPaid: boolean;
  amount: number | null;
  status: "open" | "closed" | "expired";
  responseCount: number;
  tags?: string[] | null;
  createdAt: number | string;
}

export interface ResponseItem {
  responseId: string;
  responseStatus: "pending" | "accepted" | "rejected";
  responseMessage: string;
  respondedAt: number | string;
  post: Post;
}

export interface ActiveSummary {
  myOpenPosts: Post[];
  helping: { responseId: string; post: Post }[];
}

export interface MyProfileResponse {
  ok: boolean;
  profile: Profile;
  user: PublicUser;
  trust: TrustSummary;
}

export interface PatchProfilePayload {
  name?: string;
  bio?: string;
  avatar?: string | null;
  location?: string;
  isOnboarded?: boolean;
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  skipAuth = false
): Promise<Response & { json(): Promise<T> }> {
  const token = skipAuth ? null : await getTokenAsync();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/api${path}`, { ...options, headers });
  return res as Response & { json(): Promise<T> };
}

// ─── Hono-style RPC object (used by existing screens) ─────────────────────────
// Mimics Hono RPC: api.resource.$method({ json?, query? }) → Response

export const api = {
  profile: {
    $get: async () => apiFetch<MyProfileResponse>("/profile"),
    $patch: async (opts: { json: PatchProfilePayload }) =>
      apiFetch<MyProfileResponse>("/profile", {
        method: "PATCH",
        body: JSON.stringify(opts.json),
      }),
  },

  posts: {
    $get: async (opts?: { query?: Record<string, string> }) => {
      const qs = opts?.query ? "?" + new URLSearchParams(opts.query).toString() : "";
      return apiFetch<{ ok: boolean; posts: Post[] }>(`/posts${qs}`);
    },
    $post: async (opts: { json: Record<string, unknown> }) =>
      apiFetch<{ ok: boolean; post: Post }>("/posts", {
        method: "POST",
        body: JSON.stringify(opts.json),
      }),
  },
};

// ─── Rich profile API (new screens) ──────────────────────────────────────────

async function profileFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getTokenAsync();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/api${path}`, { ...options, headers });
  const json = (await res.json()) as T;
  if (!res.ok) {
    const err = json as { message?: string; error?: string };
    throw new Error(err.message ?? err.error ?? `Request failed: ${res.status}`);
  }
  return json;
}

export const profileApi = {
  getMe: () => profileFetch<MyProfileResponse>("/profile"),

  patch: (payload: PatchProfilePayload) =>
    profileFetch<MyProfileResponse>("/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  getMyPosts: (status?: Post["status"], page = 1) =>
    profileFetch<{ ok: boolean; posts: Post[]; page: number; limit: number }>(
      `/profile/my/posts?page=${page}${status ? `&status=${status}` : ""}`
    ),

  getMyResponses: (page = 1) =>
    profileFetch<{ ok: boolean; items: ResponseItem[]; page: number; limit: number }>(
      `/profile/my/responses?page=${page}`
    ),

  getMyActive: () =>
    profileFetch<{ ok: boolean } & ActiveSummary>("/profile/my/active"),

  getPublic: (userId: string) =>
    profileFetch<{
      ok: boolean;
      profile: Profile;
      user: PublicUser;
      trust: TrustSummary;
    }>(`/profile/${userId}`),
};

// ─── AI API ───────────────────────────────────────────────────────────────────

export interface AIQuestion {
  question: string;
  options: string[];
}

export interface AnalyzeResponse {
  ok: boolean;
  complete?: boolean;
  intent?: string;
  known?: Record<string, string>;
  questions?: AIQuestion[];
}

export interface StructuredThread {
  title: string;
  body: string;
  type: "local" | "remote" | "interest";
  category: string;
  tags: string[];
  isPaid: boolean;
  amount?: number;
  urgency: "asap" | "today" | "this_week" | "flexible";
  visibility: string;
}

async function aiFetch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await apiFetch<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    const err = json as { message?: string; error?: string };
    throw new Error(err.message ?? err.error ?? `Request failed: ${res.status}`);
  }
  return json;
}

export const aiApi = {
  analyze: (request: string) =>
    aiFetch<AnalyzeResponse>("/ai/analyze", { request }),

  structure: (
    request: string,
    answers: string[],
    meta?: { intent?: string; known?: Record<string, string> },
  ) =>
    aiFetch<{ ok: boolean; thread?: StructuredThread }>("/ai/structure", {
      request,
      answers,
      ...(meta?.intent ? { intent: meta.intent } : {}),
      ...(meta?.known ? { known: meta.known } : {}),
    }),
};
