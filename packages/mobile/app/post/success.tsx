import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, ArrowRight, House } from 'phosphor-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, FontSize, Radius, Font } from '../../lib/theme';

const URGENCY_EXPIRES: Record<string, string> = {
  asap: '2 hours',
  today: '24 hours',
  this_week: '7 days',
  flexible: '3 days',
};

export default function PostSuccessScreen() {
  const { postId, urgency } = useLocalSearchParams<{ postId: string; urgency: string }>();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const expiresIn = URGENCY_EXPIRES[urgency ?? 'flexible'] ?? '3 days';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <Animated.View style={[styles.iconWrap, { transform: [{ scale: scaleAnim }] }]}>
          <CheckCircle size={72} color={Colors.textPrimary} weight="fill" />
        </Animated.View>

        <Animated.View style={[styles.textSection, { opacity: fadeAnim }]}>
          <Text style={styles.title}>Thread Posted!</Text>
          <Text style={styles.subtitle}>
            Your request is now live and being shown to the right people nearby and online.
          </Text>

          <View style={styles.statsRow}>
            {[
              { label: 'Est. reach', value: '~40 people' },
              { label: 'Expires in', value: expiresIn },
              { label: 'Status', value: 'Open' },
            ].map(stat => (
              <View key={stat.label} style={styles.statItem}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.tipCard}>
            <Text style={styles.tipEmoji}>💡</Text>
            <Text style={styles.tipText}>
              You'll get a notification when someone responds to your thread.
            </Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.actions, { opacity: fadeAnim }]}>
          {postId ? (
            <TouchableOpacity
              style={styles.ctaBtn}
              activeOpacity={0.88}
              onPress={() => router.push(`/thread/${postId}`)}
            >
              <Text style={styles.ctaBtnText}>View my thread</Text>
              <ArrowRight size={18} color="#FFFFFF" weight="bold" />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => router.replace('/(tabs)')}
          >
            <House size={16} color={Colors.textSecondary} />
            <Text style={styles.ghostBtnText}>Back to Feed</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.screenH, gap: Spacing.xl,
  },
  iconWrap: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: Colors.surfaceSoft, alignItems: 'center', justifyContent: 'center',
  },
  textSection: { alignItems: 'center', gap: Spacing.base, width: '100%' },
  title: {
    fontSize: FontSize.displayL, fontFamily: Font.sansBold,
    color: Colors.textPrimary, letterSpacing: -0.6, textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.body, fontFamily: Font.sans,
    color: Colors.textSecondary, textAlign: 'center', lineHeight: 24, maxWidth: 280,
  },
  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.surfaceSoft,
    borderRadius: Radius.lg, overflow: 'hidden', width: '100%',
    marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  statItem: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.md,
    borderRightWidth: 1, borderRightColor: Colors.border,
  },
  statValue: { fontSize: FontSize.bodyS, fontFamily: Font.sansSemibold, color: Colors.textPrimary },
  statLabel: { fontSize: FontSize.caption, fontFamily: Font.sans, color: Colors.textSecondary, marginTop: 2 },
  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: Colors.surfaceSoft, borderRadius: Radius.md, padding: Spacing.md, width: '100%',
  },
  tipEmoji: { fontSize: 16 },
  tipText: {
    fontSize: FontSize.bodyS, fontFamily: Font.sans,
    color: Colors.textSecondary, lineHeight: 20, flex: 1,
  },
  actions: { width: '100%', gap: Spacing.md },
  ctaBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.pill, height: 52,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  ctaBtnText: { fontSize: FontSize.bodyL, fontFamily: Font.sansSemibold, color: '#FFFFFF' },
  ghostBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: Spacing.md,
  },
  ghostBtnText: { fontSize: FontSize.body, fontFamily: Font.sansMedium, color: Colors.textSecondary },
});
