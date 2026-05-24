import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { ArrowLeft, MapPin, Trophy } from "phosphor-react-native";
import { Colors, Spacing, FontSize, Font, Radius, Shadows } from "../../lib/theme";
import { profileApi, type Profile, type PublicUser, type TrustSummary } from "../../lib/api";

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function PublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [trust, setTrust] = useState<TrustSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    profileApi
      .getPublic(userId)
      .then((data) => {
        setUser(data.user);
        setProfile(data.profile);
        setTrust(data.trust);
      })
      .catch(() => setError("Could not load profile"))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !user || !profile) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || "Profile not found"}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(user.name)}</Text>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          {profile.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : (
            <Text style={styles.bioMuted}>No bio yet</Text>
          )}
          {profile.location ? (
            <View style={styles.locationRow}>
              <MapPin size={14} color={Colors.textSecondary} />
              <Text style={styles.location}>{profile.location}</Text>
            </View>
          ) : null}
          {trust?.badge ? (
            <View style={styles.badgeRow}>
              <Trophy size={14} color={Colors.warning} weight="fill" />
              <Text style={styles.badgeText}>{trust.badge}</Text>
            </View>
          ) : null}
        </View>

        {trust && (
          <View style={styles.metricsCard}>
            {[
              { label: "Posted", value: trust.posted },
              { label: "Helped", value: trust.helped },
              { label: "Completed", value: trust.completed },
            ].map((m) => (
              <View key={m.label} style={styles.metric}>
                <Text style={styles.metricValue}>{m.value}</Text>
                <Text style={styles.metricLabel}>{m.label}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSize.subheading,
    fontFamily: Font.serif,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  content: { padding: Spacing.screenH, paddingTop: Spacing.xl },
  hero: { alignItems: "center", marginBottom: Spacing.xl },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  avatarText: { fontSize: 28, fontFamily: Font.sansBold, color: "#fff" },
  name: {
    fontSize: FontSize.heading,
    fontFamily: Font.serif,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  bio: {
    fontSize: FontSize.body,
    fontFamily: Font.sans,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  bioMuted: {
    fontSize: FontSize.body,
    fontFamily: Font.sans,
    color: Colors.textPlaceholder,
    marginBottom: Spacing.sm,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Spacing.xs,
  },
  location: { fontSize: FontSize.bodyS, fontFamily: Font.sans, color: Colors.textSecondary },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: Spacing.md,
    backgroundColor: Colors.surfaceSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  badgeText: { fontSize: FontSize.caption, fontFamily: Font.sansMedium, color: Colors.warning },
  metricsCard: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceSoft,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    ...Shadows.xs,
  },
  metric: { flex: 1, alignItems: "center" },
  metricValue: { fontSize: FontSize.subheading, fontFamily: Font.sansBold, color: Colors.textPrimary },
  metricLabel: { fontSize: FontSize.caption, fontFamily: Font.sans, color: Colors.textSecondary, marginTop: 2 },
  errorText: { fontSize: FontSize.body, fontFamily: Font.sans, color: Colors.textSecondary },
});
