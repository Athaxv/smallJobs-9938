import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import {
  StyleSheet, Text, TextInput, TouchableOpacity,
  View, Dimensions, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
  ImageBackground, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { useQueryClient } from '@tanstack/react-query';
import { Font, Colors } from '../lib/theme';
import { getTokenAsync, getSession, type AuthUser } from '../lib/auth';
import { api } from '../lib/api';

const { width, height } = Dimensions.get('window');

function animSpring(anim: Animated.Value, toValue: number, delay = 0, snappy = false) {
  const spring = Animated.spring(anim, {
    toValue,
    damping: snappy ? 20 : 28,
    stiffness: snappy ? 220 : 120,
    mass: snappy ? 0.6 : 0.8,
    useNativeDriver: true,
  });
  return delay > 0 ? Animated.sequence([Animated.delay(delay), spring]) : spring;
}

// ─────────────────────────────────────────────────────────────────────────────
// Welcome / Landing screen
// ─────────────────────────────────────────────────────────────────────────────
function WelcomeScreen() {
  const router = useRouter();

  const logoY   = useRef(new Animated.Value(-30)).current;
  const logoO   = useRef(new Animated.Value(0)).current;
  const cardY   = useRef(new Animated.Value(60)).current;
  const cardO   = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(0.88)).current;
  const btnO    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      animSpring(logoY, 0, 0),
      animSpring(logoO, 1, 0),
      animSpring(cardY, 0, 120),
      animSpring(cardO, 1, 120),
      animSpring(btnScale, 1, 260, true),
      animSpring(btnO, 1, 260, true),
    ]).start();
  }, []);

  return (
    <ImageBackground
      source={require('../assets/images/bg-onboarding.png')}
      style={styles.bg}
      resizeMode="cover"
    >
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.header, { opacity: logoO, transform: [{ translateY: logoY }] }]}>
          <View style={styles.logoPill}>
            <Text style={styles.logoText}>SmallJobs</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.card, { opacity: cardO, transform: [{ translateY: cardY }] }]}>
          <Text style={styles.headline}>Find work{'\n'}near you</Text>
          <Text style={styles.sub}>
            Post gigs, discover local opportunities,{'\n'}and connect with your community.
          </Text>

          <Animated.View style={{ opacity: btnO, transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              style={styles.btnPrimary}
              activeOpacity={0.85}
              onPress={() => router.push('/auth/signup')}
            >
              <Text style={styles.btnPrimaryText}>Get started</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnSecondary}
              activeOpacity={0.7}
              onPress={() => router.push('/auth/login')}
            >
              <Text style={styles.btnSecondaryText}>I already have an account</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    </ImageBackground>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile setup screen
// ─────────────────────────────────────────────────────────────────────────────
function ProfileSetupScreen({ session }: { session: any }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState('');

  const avatarScale = useRef(new Animated.Value(0.6)).current;
  const avatarO     = useRef(new Animated.Value(0)).current;
  const headY       = useRef(new Animated.Value(24)).current;
  const headO       = useRef(new Animated.Value(0)).current;
  const formY       = useRef(new Animated.Value(40)).current;
  const formO       = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      animSpring(avatarScale, 1, 0, true),
      animSpring(avatarO, 1, 0, true),
      animSpring(headY, 0, 80),
      animSpring(headO, 1, 80),
      animSpring(formY, 0, 180),
      animSpring(formO, 1, 180),
    ]).start();
  }, []);

  const detectLocation = async () => {
    setLocLoading(true);
    setLocError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocError('Location permission denied. Enter manually.');
        setLocLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [addr] = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      if (addr) {
        const parts = [addr.district || addr.subregion || addr.street, addr.city].filter(Boolean);
        setLocation(parts.length ? parts.join(', ') : addr.formattedAddress ?? '');
      } else {
        setLocError('Could not resolve address. Enter manually.');
      }
    } catch {
      setLocError('Location unavailable. Enter manually.');
    } finally {
      setLocLoading(false);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await api.profile.$patch({
        json: {
          location: location.trim() || undefined,
          bio: bio.trim() || undefined,
          isOnboarded: true,
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any)?.message ?? `HTTP ${res.status}`);
      }
      await queryClient.invalidateQueries({ queryKey: ['profile', session.user.id] });
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.message ?? 'Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      await api.profile.$patch({ json: { isOnboarded: true } });
      await queryClient.invalidateQueries({ queryKey: ['profile', session.user.id] });
    } catch {}
    router.replace('/(tabs)');
  };

  return (
    <ImageBackground
      source={require('../assets/images/bg-onboarding.png')}
      style={styles.bg}
      resizeMode="cover"
    >
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.header}>
            <View style={styles.logoPill}>
              <Text style={styles.logoText}>SmallJobs</Text>
            </View>
            <TouchableOpacity onPress={handleSkip} disabled={saving}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.card}>
              <Animated.View style={[styles.avatarCircle, { opacity: avatarO, transform: [{ scale: avatarScale }] }]}>
                <Text style={styles.avatarText}>
                  {session.user.name?.charAt(0).toUpperCase() ?? '?'}
                </Text>
              </Animated.View>

              <Animated.View style={{ opacity: headO, transform: [{ translateY: headY }] }}>
                <Text style={styles.headline}>Hey, {session.user.name?.split(' ')[0]} 👋</Text>
                <Text style={styles.sub}>Just a couple things to help people find you.</Text>
              </Animated.View>

              <Animated.View style={{ opacity: formO, transform: [{ translateY: formY }] }}>
                {!!error && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Your neighbourhood / city</Text>
                  <View style={styles.locationRow}>
                    <TextInput
                      style={[styles.input, styles.locationInput]}
                      placeholder="e.g. Koramangala, Bengaluru"
                      placeholderTextColor="#ADADAD"
                      value={location}
                      onChangeText={(t) => { setLocation(t); setLocError(''); }}
                      autoCapitalize="words"
                    />
                    <TouchableOpacity
                      style={[styles.locBtn, locLoading && { opacity: 0.5 }]}
                      onPress={detectLocation}
                      disabled={locLoading}
                      activeOpacity={0.75}
                    >
                      {locLoading
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={styles.locBtnText}>📍</Text>
                      }
                    </TouchableOpacity>
                  </View>
                  {!!locError && <Text style={styles.locErrorText}>{locError}</Text>}
                  {!locError && !location && <Text style={styles.locHint}>Tap 📍 to auto-detect your location</Text>}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    Short bio <Text style={styles.labelOptional}>(optional)</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, styles.inputMulti]}
                    placeholder="What kind of help do you offer or need?"
                    placeholderTextColor="#ADADAD"
                    value={bio}
                    onChangeText={setBio}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.btnPrimary, saving && { opacity: 0.55 }]}
                  activeOpacity={0.85}
                  onPress={handleComplete}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Let's go</Text>}
                </TouchableOpacity>
              </Animated.View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root export
// ─────────────────────────────────────────────────────────────────────────────
export default function Onboarding() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.textPrimary} />
      </View>
    );
  }

  if (!user) return <WelcomeScreen />;
  return <ProfileSetupScreen session={{ user }} />;
}

const styles = StyleSheet.create({
  bg: { flex: 1, width, height },
  safe: { flex: 1, justifyContent: 'space-between' },
  header: {
    paddingTop: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoPill: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  logoText: { fontSize: 22, fontFamily: Font.serif, color: '#111111', letterSpacing: -0.3 },
  skipText: {
    fontSize: 14,
    fontFamily: Font.sansMedium,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 12,
  },
  avatarCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#E8E8E8',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: { fontSize: 22, fontFamily: Font.sansBold, color: '#111111' },
  headline: { fontSize: 38, fontFamily: Font.serif, color: '#111111', lineHeight: 44, marginBottom: 8 },
  sub: { fontSize: 14, fontFamily: Font.sans, color: '#6B6B6B', lineHeight: 22, marginBottom: 28 },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 13, fontFamily: Font.sans, color: '#DC2626' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: Font.sansSemibold, color: '#444', marginBottom: 7 },
  labelOptional: { fontFamily: Font.sans, color: '#ADADAD' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationInput: { flex: 1 },
  locBtn: { backgroundColor: '#111111', borderRadius: 12, width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  locBtnText: { fontSize: 20 },
  locHint: { fontSize: 11, fontFamily: Font.sans, color: '#ADADAD', marginTop: 5 },
  locErrorText: { fontSize: 11, fontFamily: Font.sans, color: '#DC2626', marginTop: 5 },
  input: {
    backgroundColor: '#F5F5F5', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, fontFamily: Font.sans, color: '#111111',
    borderWidth: 1, borderColor: '#E8E8E8',
  },
  inputMulti: { height: 88, paddingTop: 14 },
  btnPrimary: { backgroundColor: '#111111', borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 8 },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontFamily: Font.sansSemibold },
  btnSecondary: { paddingVertical: 14, alignItems: 'center' },
  btnSecondaryText: { color: '#111111', fontSize: 14, fontFamily: Font.sansMedium },
});
