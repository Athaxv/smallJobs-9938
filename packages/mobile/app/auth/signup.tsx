import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import {
  ImageBackground, StyleSheet, Text, TextInput, TouchableOpacity,
  View, Dimensions, KeyboardAvoidingView, Platform, ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Font } from '../../lib/theme';
import { signUp } from '../../lib/auth';

const { width, height } = Dimensions.get('window');

function animSpring(anim: Animated.Value, toValue: number, delay = 0) {
  const spring = Animated.spring(anim, {
    toValue,
    damping: 28,
    stiffness: 120,
    mass: 0.8,
    useNativeDriver: true,
  });
  return delay > 0 ? Animated.sequence([Animated.delay(delay), spring]) : spring;
}

export default function Signup() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const topRowO = useRef(new Animated.Value(0)).current;
  const topRowY = useRef(new Animated.Value(-20)).current;
  const headO   = useRef(new Animated.Value(0)).current;
  const headY   = useRef(new Animated.Value(28)).current;
  const field1O = useRef(new Animated.Value(0)).current;
  const field1Y = useRef(new Animated.Value(32)).current;
  const field2O = useRef(new Animated.Value(0)).current;
  const field2Y = useRef(new Animated.Value(32)).current;
  const field3O = useRef(new Animated.Value(0)).current;
  const field3Y = useRef(new Animated.Value(32)).current;
  const btnsO   = useRef(new Animated.Value(0)).current;
  const btnsY   = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      animSpring(topRowO, 1, 0),
      animSpring(topRowY, 0, 0),
      animSpring(headO, 1, 80),
      animSpring(headY, 0, 80),
      animSpring(field1O, 1, 150),
      animSpring(field1Y, 0, 150),
      animSpring(field2O, 1, 210),
      animSpring(field2Y, 0, 210),
      animSpring(field3O, 1, 270),
      animSpring(field3Y, 0, 270),
      animSpring(btnsO, 1, 340),
      animSpring(btnsY, 0, 340),
    ]).start();
  }, []);

  const handleSignup = async () => {
    if (!name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signUp(name, email, password);
      // New users always need onboarding
      router.replace('/onboarding');
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      setError('Google sign-in is not available.');
      setGoogleLoading(false);
      return;
    } catch (e: any) {
      setError(e.message ?? 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/images/bg-onboarding.png')}
      style={styles.bg}
      resizeMode="cover"
    >
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={styles.safe}>

          <Animated.View style={[styles.topRow, { opacity: topRowO, transform: [{ translateY: topRowY }] }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <View style={styles.logoPill}>
              <Text style={styles.logoText}>SmallJobs</Text>
            </View>
          </Animated.View>

          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.card}>

              <Animated.View style={{ opacity: headO, transform: [{ translateY: headY }] }}>
                <Text style={styles.headline}>Create{'\n'}account</Text>
                <Text style={styles.sub}>Join your neighbourhood</Text>
                {!!error && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}
              </Animated.View>

              <Animated.View style={[styles.inputGroup, { opacity: field1O, transform: [{ translateY: field1Y }] }]}>
                <Text style={styles.label}>Full name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Rahul Sharma"
                  placeholderTextColor="#ADADAD"
                  autoCapitalize="words"
                  value={name}
                  onChangeText={setName}
                />
              </Animated.View>

              <Animated.View style={[styles.inputGroup, { opacity: field2O, transform: [{ translateY: field2Y }] }]}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#ADADAD"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                />
              </Animated.View>

              <Animated.View style={[styles.inputGroup, { opacity: field3O, transform: [{ translateY: field3Y }] }]}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Min. 8 characters"
                  placeholderTextColor="#ADADAD"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </Animated.View>

              <Animated.View style={{ opacity: btnsO, transform: [{ translateY: btnsY }] }}>
                <TouchableOpacity
                  style={[styles.btnPrimary, loading && { opacity: 0.55 }]}
                  activeOpacity={0.85}
                  onPress={handleSignup}
                  disabled={loading}
                >
                  <Text style={styles.btnPrimaryText}>
                    {loading ? 'Creating account…' : 'Create account'}
                  </Text>
                </TouchableOpacity>

                {/* Google OAuth — temporarily disabled
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={[styles.btnGoogle, googleLoading && { opacity: 0.55 }]}
                  activeOpacity={0.85}
                  onPress={handleGoogle}
                  disabled={googleLoading}
                >
                  <Text style={styles.googleG}>G</Text>
                  <Text style={styles.btnGoogleText}>
                    {googleLoading ? 'Redirecting…' : 'Continue with Google'}
                  </Text>
                </TouchableOpacity>
                */}

                <View style={styles.switchRow}>
                  <Text style={styles.switchText}>Already have an account? </Text>
                  <TouchableOpacity onPress={() => router.replace('/auth/login')}>
                    <Text style={styles.switchLink}>Sign in</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>

            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, width, height },
  safe: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 24,
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backText: { color: '#111111', fontFamily: Font.sansSemibold, fontSize: 14 },
  logoPill: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  logoText: {
    fontSize: 22,
    fontFamily: Font.serif,
    color: '#111111',
    letterSpacing: -0.3,
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 12,
  },
  headline: {
    fontSize: 42,
    fontFamily: Font.serif,
    color: '#111111',
    lineHeight: 48,
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    fontFamily: Font.sans,
    color: '#6B6B6B',
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { fontSize: 13, fontFamily: Font.sans, color: '#DC2626' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: Font.sansSemibold, color: '#444', marginBottom: 7 },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: Font.sans,
    color: '#111111',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  btnPrimary: {
    backgroundColor: '#111111',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontFamily: Font.sansSemibold },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E8E8E8' },
  dividerText: { fontSize: 13, fontFamily: Font.sans, color: '#ADADAD' },
  btnGoogle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    marginBottom: 24,
    gap: 10,
  },
  googleG: { fontSize: 17, fontFamily: Font.sansBold, color: '#111111' },
  btnGoogleText: { fontSize: 15, fontFamily: Font.sansMedium, color: '#111111' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchText: { fontSize: 14, fontFamily: Font.sans, color: '#888' },
  switchLink: { fontSize: 14, fontFamily: Font.sansBold, color: '#111111' },
});
