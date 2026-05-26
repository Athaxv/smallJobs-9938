import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import {
  MapPin,
  CalendarBlank,
  ShieldCheck,
  CheckCircle,
  ClockCountdown,
  Lightning,
  BellSimple,
  Lock,
  PencilSimple,
  SignOut,
  Question,
  CaretRight,
  Trophy,
} from "phosphor-react-native";
import { categoryEmoji } from "@template/web/categories";
import { Colors, Spacing, FontSize, Font, Radius, Shadows } from "../../lib/theme";
import { signOut } from "../../lib/auth";
import { profileApi, type Post, type TrustSummary, type Profile, type PublicUser } from "../../lib/api";
import { displayPostTitle } from "../../lib/postDisplay";
import { isNavigablePost, navigateAfterJoin, navigateToExploreRoute } from "../../lib/explore-route";
import {
  getPostDisplayStatus,
  isPostFeedVisible,
  type PostDisplayStatus,
} from "../../lib/postVisibility";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatJoined(ts: number | string): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function timeAgo(ts: number | string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PostStatusPill({ status }: { status: PostDisplayStatus }) {
  const pillStyle =
    status === "open" ? styles.statusPillOpen :
    status === "expired" ? styles.statusPillExpired : styles.statusPillClosed;
  const textStyle =
    status === "open" ? styles.statusTextOpen :
    status === "expired" ? styles.statusTextExpired : styles.statusTextClosed;
  const label = status === "open" ? "Open" : status === "expired" ? "Expired" : "Closed";

  return (
    <View style={pillStyle}>
      <Text style={textStyle}>{label}</Text>
    </View>
  );
}

function TrustBadge({ badge }: { badge: string | null }) {
  if (!badge) return null;
  return (
    <View style={styles.trustBadge}>
      <Trophy size={11} color={Colors.warning} weight="fill" />
      <Text style={styles.trustBadgeText}>{badge}</Text>
    </View>
  );
}

interface TrustCardProps {
  trust: TrustSummary;
  profile: Profile;
  userEmail?: string;
}

function TrustCard({ trust, profile, userEmail }: TrustCardProps) {
  const metrics = [
    { label: "Posted", value: String(trust.posted), emoji: "📝" },
    { label: "Helped", value: String(trust.helped), emoji: "🤝" },
    { label: "Completed", value: String(trust.completed), emoji: "✅" },
    {
      label: "Response",
      value: trust.responseRate !== null ? `${trust.responseRate}%` : "—",
      emoji: "⚡",
    },
  ];

  const verifications: { label: string; verified: boolean }[] = [
    { label: "Email", verified: true },
    { label: "Phone", verified: false },
    { label: "ID", verified: false },
  ];

  return (
    <View style={styles.glassCard}>
      <View style={styles.glassCardHeader}>
        <View style={styles.cardIconWrap}>
          <ShieldCheck size={16} color="#fff" weight="duotone" />
        </View>
        <Text style={styles.glassCardTitle}>Trust & Reliability</Text>
        {trust.badge && <TrustBadge badge={trust.badge} />}
      </View>

      {/* Metrics row */}
      <View style={styles.metricsRow}>
        {metrics.map((m) => (
          <View key={m.label} style={styles.metricBox}>
            <Text style={styles.metricEmoji}>{m.emoji}</Text>
            <Text style={styles.metricValue}>{m.value}</Text>
            <Text style={styles.metricLabel}>{m.label}</Text>
          </View>
        ))}
      </View>

      {/* Verifications */}
      <View style={styles.verifyRow}>
        {verifications.map((v) => (
          <View key={v.label} style={[styles.verifyChip, v.verified && styles.verifyChipActive]}>
            <CheckCircle
              size={11}
              color={v.verified ? Colors.success : Colors.textPlaceholder}
              weight={v.verified ? "fill" : "regular"}
            />
            <Text style={[styles.verifyLabel, v.verified && styles.verifyLabelActive]}>
              {v.label}
            </Text>
          </View>
        ))}
      </View>

      {!trust.badge && (
        <Text style={styles.trustHint}>
          Complete tasks and help others to build your reputation.
        </Text>
      )}
    </View>
  );
}

interface ActiveTasksProps {
  myOpenPosts: Post[];
  helping: { responseId: string; conversationId?: string; post: Post }[];
}

function ActiveTasks({ myOpenPosts, helping }: ActiveTasksProps) {
  const visibleOpenPosts = myOpenPosts.filter(isPostFeedVisible);

  if (visibleOpenPosts.length === 0 && helping.length === 0) {
    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionCardHeader}>
          <Lightning size={16} color={Colors.textPrimary} weight="duotone" />
          <Text style={styles.sectionCardTitle}>Active Tasks</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>No active tasks right now</Text>
          <Text style={styles.emptySubtext}>Post a request or help someone nearby</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionCardHeader}>
        <Lightning size={16} color={Colors.textPrimary} weight="duotone" />
        <Text style={styles.sectionCardTitle}>Active Tasks</Text>
      </View>

      {visibleOpenPosts.length > 0 && (
        <View style={styles.taskGroup}>
          <Text style={styles.taskGroupLabel}>My open requests</Text>
          {visibleOpenPosts.slice(0, 3).map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.taskItem}
              onPress={() => router.push(`/thread/${p.id}` as any)}
            >
              <Text style={styles.taskEmoji}>{categoryEmoji(p.category)}</Text>
              <View style={styles.taskInfo}>
                <Text style={styles.taskTitle} numberOfLines={1}>
                  {displayPostTitle(p.title, p.body, p.category)}
                </Text>
                <Text style={styles.taskMeta}>
                  {p.responseCount} response{p.responseCount !== 1 ? "s" : ""} · {timeAgo(p.createdAt)}
                </Text>
              </View>
              <PostStatusPill status={getPostDisplayStatus(p)} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {helping.length > 0 && (
        <View style={styles.taskGroup}>
          <Text style={styles.taskGroupLabel}>Helping with</Text>
          {helping.slice(0, 3).map((h) => (
            <TouchableOpacity
              key={h.responseId}
              style={styles.taskItem}
              onPress={() => {
                if (isNavigablePost(h.post) && h.conversationId) {
                  navigateToExploreRoute(h.post, h.conversationId);
                } else if (h.conversationId) {
                  navigateAfterJoin(h.post, h.conversationId);
                } else {
                  router.push(`/thread/${h.post.id}` as any);
                }
              }}
            >
              <Text style={styles.taskEmoji}>{categoryEmoji(h.post.category)}</Text>
              <View style={styles.taskInfo}>
                <Text style={styles.taskTitle} numberOfLines={1}>
                  {displayPostTitle(h.post.title, h.post.body, h.post.category)}
                </Text>
                <Text style={styles.taskMeta}>You're helping · {timeAgo(h.post.createdAt)}</Text>
              </View>
              <PostStatusPill status={getPostDisplayStatus(h.post)} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

type HistoryTab = "posted" | "helped";

interface HistoryProps {
  posts: Post[];
  responses: { responseId: string; responseStatus: string; post: Post }[];
  tab: HistoryTab;
  onTabChange: (t: HistoryTab) => void;
  loading: boolean;
}

function History({ posts, responses, tab, onTabChange, loading }: HistoryProps) {
  const TABS: { key: HistoryTab; label: string }[] = [
    { key: "posted", label: "Posted" },
    { key: "helped", label: "Helped" },
  ];

  const items = tab === "posted" ? posts : responses.map((r) => r.post);

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionCardHeader}>
        <ClockCountdown size={16} color={Colors.textPrimary} weight="duotone" />
        <Text style={styles.sectionCardTitle}>History</Text>
      </View>

      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabChip, tab === t.key && styles.tabChipActive]}
            onPress={() => onTabChange(t.key)}
          >
            <Text style={[styles.tabChipText, tab === t.key && styles.tabChipTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.textPlaceholder} style={{ marginVertical: 24 }} />
      ) : items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>{tab === "posted" ? "📝" : "🤝"}</Text>
          <Text style={styles.emptyText}>
            {tab === "posted" ? "No posts yet" : "Haven't helped anyone yet"}
          </Text>
          <Text style={styles.emptySubtext}>
            {tab === "posted"
              ? "Post your first request on the Feed tab"
              : "Browse the Feed to find people who need help"}
          </Text>
        </View>
      ) : (
        <View style={styles.historyList}>
          {items.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.historyItem}
              onPress={() => router.push(`/thread/${p.id}` as any)}
            >
              <Text style={styles.historyEmoji}>{categoryEmoji(p.category)}</Text>
              <View style={styles.historyInfo}>
                <Text style={styles.historyTitle} numberOfLines={1}>
                  {displayPostTitle(p.title, p.body, p.category)}
                </Text>
                <Text style={styles.historyMeta}>
                  {p.category} · {timeAgo(p.createdAt)}
                </Text>
              </View>
              <PostStatusPill status={getPostDisplayStatus(p)} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [historyTab, setHistoryTab] = useState<HistoryTab>("posted");

  const [user, setUser] = useState<PublicUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [trust, setTrust] = useState<TrustSummary | null>(null);
  const [myOpenPosts, setMyOpenPosts] = useState<Post[]>([]);
  const [helping, setHelping] = useState<{ responseId: string; conversationId?: string; post: Post }[]>([]);
  const [postedPosts, setPostedPosts] = useState<Post[]>([]);
  const [helpedItems, setHelpedItems] = useState<{ responseId: string; responseStatus: string; post: Post }[]>([]);

  const loadAll = useCallback(async () => {
    try {
      const [me, active, posted, helped] = await Promise.all([
        profileApi.getMe(),
        profileApi.getMyActive(),
        profileApi.getMyPosts(),
        profileApi.getMyResponses(),
      ]);
      setUser(me.user);
      setProfile(me.profile);
      setTrust(me.trust);
      setMyOpenPosts(active.myOpenPosts);
      setHelping(active.helping);
      setPostedPosts(posted.posts);
      setHelpedItems(helped.items);
    } catch (e) {
      console.error("Profile load failed", e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadAll().finally(() => setLoading(false));
    }, [loadAll])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const handleHistoryTabChange = async (tab: HistoryTab) => {
    setHistoryTab(tab);
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
            router.replace('/onboarding');
          } catch {
            Alert.alert("Error", "Could not sign out. Please try again.");
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  const displayName = user?.name ?? "You";
  const joined = profile ? formatJoined(profile.createdAt) : "";

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.textPlaceholder} />
        }
      >
        {/* ── Hero Section ── */}
        <View style={styles.hero}>
          {/* Dark overlay layers for depth */}
          <View style={styles.heroLayerDark} />
          <View style={styles.heroLayerMid} />

          {/* Top row: greeting + edit button */}
          <View style={styles.heroTopRow}>
            <Text style={styles.greetingLabel}>{greeting()}</Text>
            <TouchableOpacity
              style={styles.editIconBtn}
              onPress={() => router.push("/edit-profile")}
            >
              <PencilSimple size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Avatar + name block */}
          <View style={styles.heroProfile}>
            {/* Avatar with glow ring */}
            <View style={styles.avatarGlow}>
              <View style={styles.avatarRing}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{initials(displayName)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.heroInfo}>
              <Text style={styles.heroName}>{displayName}</Text>
              {profile?.bio ? (
                <Text style={styles.heroBio} numberOfLines={2}>{profile.bio}</Text>
              ) : (
                <TouchableOpacity onPress={() => router.push("/edit-profile")}>
                  <Text style={styles.heroBioPlaceholder}>Add a short bio →</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Meta chips row */}
          <View style={styles.heroMeta}>
            {profile?.location ? (
              <View style={styles.heroChip}>
                <MapPin size={11} color="rgba(255,255,255,0.7)" />
                <Text style={styles.heroChipText}>{profile.location}</Text>
              </View>
            ) : null}
            {joined ? (
              <View style={styles.heroChip}>
                <CalendarBlank size={11} color="rgba(255,255,255,0.7)" />
                <Text style={styles.heroChipText}>Since {joined}</Text>
              </View>
            ) : null}
            {trust?.badge && (
              <View style={styles.heroBadgeChip}>
                <Trophy size={11} color={Colors.warning} weight="fill" />
                <Text style={styles.heroBadgeText}>{trust.badge}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Content ── */}
        <View style={styles.content}>

          {/* ── Trust Card ── */}
          {trust && profile && (
            <TrustCard trust={trust} profile={profile} userEmail={user?.email} />
          )}

          {/* ── Active Tasks ── */}
          <ActiveTasks myOpenPosts={myOpenPosts} helping={helping} />

          {/* ── History ── */}
          <History
            posts={postedPosts}
            responses={helpedItems}
            tab={historyTab}
            onTabChange={handleHistoryTabChange}
            loading={historyLoading}
          />

          {/* ── Settings ── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <Text style={styles.sectionCardTitle}>Settings</Text>
            </View>

            {[
              {
                icon: <BellSimple size={17} color={Colors.textSecondary} />,
                label: "Notifications",
                onPress: () =>
                  Alert.alert(
                    "Notifications",
                    "Nearby alerts are enabled when location and notifications are allowed on your device.",
                  ),
              },
              {
                icon: <Lock size={17} color={Colors.textSecondary} />,
                label: "Privacy & Safety",
                onPress: () => Alert.alert("Coming Soon", "Privacy settings will be available soon."),
              },
              {
                icon: <PencilSimple size={17} color={Colors.textSecondary} />,
                label: "Edit Profile",
                onPress: () => router.push("/edit-profile"),
              },
              {
                icon: <Question size={17} color={Colors.textSecondary} />,
                label: "Help & Support",
                onPress: () => Alert.alert("Help", "Email us at hello@smalljobs.app"),
              },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={styles.settingsRow} onPress={item.onPress}>
                <View style={styles.settingsLeft}>
                  <View style={styles.settingsIconWrap}>{item.icon}</View>
                  <Text style={styles.settingsLabel}>{item.label}</Text>
                </View>
                <CaretRight size={13} color={Colors.textPlaceholder} />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.settingsRow, styles.signOutRow]}
              onPress={handleSignOut}
              disabled={signingOut}
            >
              <View style={styles.settingsLeft}>
                <View style={[styles.settingsIconWrap, styles.settingsIconDanger]}>
                  {signingOut ? (
                    <ActivityIndicator size="small" color={Colors.error} />
                  ) : (
                    <SignOut size={17} color={Colors.error} />
                  )}
                </View>
                <Text style={[styles.settingsLabel, { color: Colors.error }]}>
                  {signingOut ? "Signing out…" : "Sign Out"}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>smallJobs · v0.1</Text>
            <Text style={styles.footerDot}>·</Text>
            <Text style={styles.footerText}>Built with care</Text>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F8F8" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    backgroundColor: "#0A0A0A",
    paddingHorizontal: Spacing.screenH,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    overflow: "hidden",
    position: "relative",
  },
  heroLayerDark: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  heroLayerMid: {
    position: "absolute",
    bottom: -40,
    left: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  greetingLabel: {
    fontSize: FontSize.displayL,
    fontFamily: Font.serif,
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  editIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroProfile: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.base,
    marginBottom: Spacing.base,
  },
  // Avatar glow layers
  avatarGlow: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontFamily: Font.sansBold,
    color: "#111111",
  },
  heroInfo: { flex: 1 },
  heroName: {
    fontSize: FontSize.heading,
    fontFamily: Font.serif,
    color: "#FFFFFF",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  heroBio: {
    fontSize: FontSize.bodyS,
    fontFamily: Font.sans,
    color: "rgba(255,255,255,0.6)",
    lineHeight: 18,
  },
  heroBioPlaceholder: {
    fontSize: FontSize.bodyS,
    fontFamily: Font.sans,
    color: "rgba(255,255,255,0.35)",
  },
  heroMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  heroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  heroChipText: {
    fontSize: FontSize.caption,
    fontFamily: Font.sans,
    color: "rgba(255,255,255,0.7)",
  },
  heroBadgeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245,158,11,0.15)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  heroBadgeText: {
    fontSize: FontSize.caption,
    fontFamily: Font.sansMedium,
    color: Colors.warning,
  },

  // ── Content ───────────────────────────────────────────────────────────────
  content: {
    paddingHorizontal: Spacing.screenH,
    paddingTop: Spacing.lg,
    gap: Spacing.base,
  },

  // ── Glass Trust Card ──────────────────────────────────────────────────────
  glassCard: {
    backgroundColor: "#0A0A0A",
    borderRadius: Radius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  glassCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  cardIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  glassCardTitle: {
    flex: 1,
    fontSize: FontSize.body,
    fontFamily: Font.serif,
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: Spacing.base,
  },
  metricBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: Radius.md,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  metricEmoji: { fontSize: 14, marginBottom: 3 },
  metricValue: {
    fontSize: FontSize.subheading,
    fontFamily: Font.sansBold,
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontSize: 10,
    fontFamily: Font.sans,
    color: "rgba(255,255,255,0.45)",
    marginTop: 2,
  },
  verifyRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
    marginBottom: 8,
  },
  verifyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  verifyChipActive: {
    borderColor: "rgba(34,197,94,0.4)",
    backgroundColor: "rgba(34,197,94,0.08)",
  },
  verifyLabel: {
    fontSize: FontSize.caption,
    fontFamily: Font.sans,
    color: "rgba(255,255,255,0.35)",
  },
  verifyLabelActive: { color: Colors.success },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245,158,11,0.15)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  trustBadgeText: {
    fontSize: FontSize.caption,
    fontFamily: Font.sansMedium,
    color: Colors.warning,
  },
  trustHint: {
    fontSize: FontSize.caption,
    fontFamily: Font.sans,
    color: "rgba(255,255,255,0.3)",
    lineHeight: 16,
    marginTop: 4,
  },

  // ── Section Cards (light) ─────────────────────────────────────────────────
  sectionCard: {
    backgroundColor: Colors.background,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.xs,
  },
  sectionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionCardTitle: {
    flex: 1,
    fontSize: FontSize.body,
    fontFamily: Font.serif,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },

  // Task items
  taskGroup: { marginBottom: Spacing.md },
  taskGroupLabel: {
    fontSize: FontSize.caption,
    fontFamily: Font.sansSemibold,
    color: Colors.textPlaceholder,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: Spacing.sm,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  taskEmoji: { fontSize: 18, width: 26, textAlign: "center" },
  taskInfo: { flex: 1 },
  taskTitle: {
    fontSize: FontSize.bodyS,
    fontFamily: Font.sansMedium,
    color: Colors.textPrimary,
  },
  taskMeta: {
    fontSize: FontSize.caption,
    fontFamily: Font.sans,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Status pills
  statusPillOpen: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: Colors.infoSurface,
  },
  statusTextOpen: {
    fontSize: FontSize.caption,
    fontFamily: Font.sansMedium,
    color: Colors.info,
  },
  statusPillHelping: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: Colors.successSurface,
  },
  statusTextHelping: {
    fontSize: FontSize.caption,
    fontFamily: Font.sansMedium,
    color: Colors.success,
  },
  statusPillClosed: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceSoft,
  },
  statusTextClosed: {
    fontSize: FontSize.caption,
    fontFamily: Font.sansMedium,
    color: Colors.textSecondary,
  },
  statusPillExpired: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: "#FEE2E2",
  },
  statusTextExpired: {
    fontSize: FontSize.caption,
    fontFamily: Font.sansMedium,
    color: "#B91C1C",
  },

  // Tab chips
  tabRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.md },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSoft,
  },
  tabChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabChipText: {
    fontSize: FontSize.bodyS,
    fontFamily: Font.sansMedium,
    color: Colors.textSecondary,
  },
  tabChipTextActive: { color: "#fff" },

  // History list
  historyList: { gap: 0 },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  historyEmoji: { fontSize: 16, width: 26, textAlign: "center" },
  historyInfo: { flex: 1 },
  historyTitle: {
    fontSize: FontSize.bodyS,
    fontFamily: Font.sansMedium,
    color: Colors.textPrimary,
  },
  historyMeta: {
    fontSize: FontSize.caption,
    fontFamily: Font.sans,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Settings
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingsLeft: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  settingsIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsIconDanger: { backgroundColor: Colors.errorSurface },
  settingsLabel: {
    fontSize: FontSize.body,
    fontFamily: Font.sansMedium,
    color: Colors.textPrimary,
  },
  signOutRow: { borderBottomWidth: 0, marginTop: 4 },

  // Empty state
  emptyState: { alignItems: "center", paddingVertical: Spacing.xl, gap: 6 },
  emptyIcon: { fontSize: 26 },
  emptyText: {
    fontSize: FontSize.body,
    fontFamily: Font.sansMedium,
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: FontSize.caption,
    fontFamily: Font.sans,
    color: Colors.textPlaceholder,
    textAlign: "center",
    lineHeight: 16,
  },

  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: Spacing.lg,
  },
  footerText: {
    fontSize: FontSize.caption,
    fontFamily: Font.sans,
    color: Colors.textDisabled,
  },
  footerDot: {
    fontSize: FontSize.caption,
    color: Colors.textDisabled,
  },
});
