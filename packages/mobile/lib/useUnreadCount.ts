/**
 * Polls /api/messages/conversations and returns total unread count.
 * Used by the tab bar badge — returns 0 when not authenticated or no messages.
 */
import { useState, useEffect, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { getTokenAsync, BASE_URL } from './auth';

const POLL_INTERVAL_MS = 30_000; // refresh every 30s when app is active

export function useUnreadCount(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    const token = await getTokenAsync();
    if (!token) { setCount(0); return; }
    try {
      const res = await fetch(`${BASE_URL}/api/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setCount(0); return; }
      const data = await res.json() as { ok: boolean; conversations?: { unreadCount: number }[] };
      if (data.ok && Array.isArray(data.conversations)) {
        const total = data.conversations.reduce((s, c) => s + (c.unreadCount ?? 0), 0);
        setCount(total);
      } else {
        setCount(0);
      }
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') refresh();
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [refresh]);

  return count;
}
