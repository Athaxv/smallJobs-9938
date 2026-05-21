/**
 * app/index.tsx — Auth gateway
 *
 * This screen is the entry point. It runs INSIDE Expo Router's navigation
 * context, so useRouter / useSegments work without any LinkPreviewContext error.
 *
 * It checks auth state and redirects to either /onboarding or /(tabs).
 * It never renders visible UI — just a spinner while checking.
 */
import { useEffect, useCallback, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getSession, getTokenAsync } from '../lib/auth';
import { api } from '../lib/api';
import { onAuthChange } from './_layout';
import { Colors } from '../lib/theme';

export default function Index() {
  const router = useRouter();
  const checking = useRef(false);
  const mounted = useRef(true);

  const checkAuth = useCallback(async () => {
    if (checking.current) return;
    checking.current = true;
    try {
      const token = await getTokenAsync();
      if (!mounted.current) return;

      if (!token) {
        router.replace('/onboarding');
        return;
      }

      const [user, profileRes] = await Promise.all([
        getSession(),
        api.profile.$get(),
      ]);

      if (!mounted.current) return;

      if (!user) {
        router.replace('/onboarding');
        return;
      }

      const profileJson = await profileRes.json() as any;
      const isOnboarded = profileJson?.profile?.isOnboarded ?? false;

      if (!isOnboarded) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    } catch {
      if (mounted.current) router.replace('/onboarding');
    } finally {
      checking.current = false;
    }
  }, [router]);

  useEffect(() => {
    mounted.current = true;
    checkAuth();
    return () => { mounted.current = false; };
  }, []);

  // Re-check when auth state changes (login/logout events)
  useEffect(() => {
    return onAuthChange(() => {
      checking.current = false; // allow re-check
      checkAuth();
    });
  }, [checkAuth]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={Colors.textPrimary} size="large" />
    </View>
  );
}
