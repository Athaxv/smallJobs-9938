import { useState, Component } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { View, ActivityIndicator, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';

const queryClient = new QueryClient();



// ─── Simple event bus so login/signup can trigger an auth re-check ────────────
type Listener = () => void;
const authListeners: Set<Listener> = new Set();
export function onAuthChange(fn: Listener) { authListeners.add(fn); return () => { authListeners.delete(fn); }; }
export function notifyAuthChange() { authListeners.forEach((fn) => fn()); }

// ─── Error Boundary ──────────────────────────────────────────────────────────
class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: any) { console.error('[ErrorBoundary]', error, info); }

  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <View style={{ flex: 1, backgroundColor: '#fff', padding: 24, paddingTop: 60 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#e53e3e', marginBottom: 12 }}>App crashed</Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 8 }}>{err.name}: {err.message}</Text>
          <ScrollView style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: '#555', fontFamily: 'monospace' }}>{err.stack}</Text>
          </ScrollView>
          <TouchableOpacity
            onPress={() => this.setState({ error: null })}
            style={{ marginTop: 16, padding: 12, backgroundColor: '#111', borderRadius: 8, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// ─── Root Layout ──────────────────────────────────────────────────────────────
// AuthGuard logic lives in app/index.tsx (a real screen inside the stack)
// so that useRouter/useSegments run inside Expo Router's navigation context.
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded && Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#111" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" backgroundColor="#FFFFFF" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="auth/login" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="auth/signup" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="thread/[id]" options={{ presentation: 'card', animation: 'slide_from_right' }} />
            <Stack.Screen name="post/index" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="post/ai-followup" options={{ presentation: 'modal', animation: 'none' }} />
            <Stack.Screen name="post/preview" options={{ presentation: 'modal', animation: 'none' }} />
            <Stack.Screen name="post/success" options={{ presentation: 'modal', animation: 'fade' }} />
            <Stack.Screen name="chat/[id]" options={{ presentation: 'card', animation: 'slide_from_right' }} />
            <Stack.Screen name="user/[userId]" options={{ presentation: 'card', animation: 'slide_from_right' }} />
            <Stack.Screen name="edit-profile" options={{ presentation: 'card', animation: 'slide_from_right' }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
