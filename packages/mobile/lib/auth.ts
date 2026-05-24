/**
 * Simple JWT auth — no better-auth client.
 *
 * On login/signup the server returns { token, user }.
 * We store the token in a plain cookie (web) or SecureStore (native).
 * Every API call sends it as  Authorization: Bearer <token>
 */

import { Platform } from "react-native";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { unregisterPushToken } from "./push-notifications";

export const BASE_URL = (
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  "https://b588iqpvtru3uh0q4bcng-preview-4200.runable.site"
).replace(/\/$/, "");

const COOKIE_NAME = "sj_token";
const STORE_KEY = "sj_token";

// ─── Token storage ────────────────────────────────────────────────────────────

export async function setToken(token: string) {
  if (Platform.OS === "web") {
    const expires = new Date(Date.now() + 86400 * 1000).toUTCString();
    document.cookie = `${COOKIE_NAME}=${token}; path=/; expires=${expires}; SameSite=None; Secure`;
  } else {
    await SecureStore.setItemAsync(STORE_KEY, token);
  }
}

export function getToken(): string | null {
  if (Platform.OS === "web") {
    const match = document.cookie
      .split("; ")
      .find((r) => r.startsWith(`${COOKIE_NAME}=`));
    return match ? match.split("=")[1] : null;
  }
  // Sync read not available — callers that need native token use getTokenAsync
  return null;
}

export async function getTokenAsync(): Promise<string | null> {
  if (Platform.OS === "web") return getToken();
  return SecureStore.getItemAsync(STORE_KEY);
}

export function clearToken() {
  if (Platform.OS === "web") {
    document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  } else {
    SecureStore.deleteItemAsync(STORE_KEY);
  }
}

// ─── Auth API calls ───────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthResult {
  token: string;
  user: AuthUser;
}

async function authFetch(path: string, body: Record<string, string>): Promise<AuthResult> {
  const res = await fetch(`${BASE_URL}/api/auth${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json() as any;
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json as AuthResult;
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const result = await authFetch("/login", { email, password });
  await setToken(result.token);
  return result;
}

export async function signUp(name: string, email: string, password: string): Promise<AuthResult> {
  const result = await authFetch("/signup", { name, email, password });
  await setToken(result.token);
  return result;
}

export async function signOut() {
  await unregisterPushToken();
  // Await the async clear so SecureStore actually deletes before callers proceed
  if (Platform.OS === "web") {
    clearToken();
  } else {
    await SecureStore.deleteItemAsync(STORE_KEY);
  }
  // Fire-and-forget server logout (token is stateless, so this is optional)
  fetch(`${BASE_URL}/api/auth/logout`, { method: "POST" }).catch(() => {});
}

/** Verify token is still valid by calling /api/auth/me */
export async function getSession(): Promise<AuthUser | null> {
  const token = await getTokenAsync();
  if (!token) return null;
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      clearToken();
      return null;
    }
    const json = await res.json() as { user: AuthUser };
    return json.user;
  } catch {
    return null;
  }
}
