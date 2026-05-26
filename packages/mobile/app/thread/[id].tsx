import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Share, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import {
  ArrowLeft, MapPin, Globe, CurrencyCircleDollar, Clock,
  Star, ChatCircle, PaperPlaneTilt, ShareNetwork, CheckCircle,
  NavigationArrow,
} from 'phosphor-react-native';
import { Colors, Spacing, FontSize, Font, Radius, Shadows } from '../../lib/theme';
import { API_URL } from '../../lib/config';
import { getSession, getTokenAsync, type AuthUser } from '../../lib/auth';
import { api } from '../../lib/api';
import { displayPostTitle, displayPostBody } from '../../lib/postDisplay';
import {
  isNavigablePost,
  navigateAfterJoin,
  navigateToExploreRoute,
} from '../../lib/explore-route';

interface PostViewer {
  hasResponded: boolean;
  conversationId?: string;
  responseId?: string;
  arrivedAt?: string | null;
  blockedByActiveHelp?: {
    postId: string;
    postTitle: string;
    conversationId?: string;
    responseId: string;
    lat?: number | null;
    lng?: number | null;
    category?: string;
    type?: string;
  };
}

interface Post {
  id: string;
  title: string;
  body: string;
  category?: string;
  type: 'local' | 'remote' | 'interest';
  lat?: number | null;
  lng?: number | null;
  isPaid: boolean;
  amount: number | null;
  tags: string[] | null;
  status: 'open' | 'closed' | 'expired';
  urgency?: 'asap' | 'today' | 'this_week' | 'flexible';
  expiresAt?: string | number | null;
  responseCount: number;
  createdAt: string | number;
  author: {
    userId: string;
    name: string;
    avatar: string | null;
  };
}

function formatExpiresIn(expiresAt?: string | number | null): string {
  if (!expiresAt) return '';
  const ms = typeof expiresAt === 'number' ? expiresAt : new Date(expiresAt).getTime();
  const diff = ms - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours < 1) return `${Math.max(1, Math.floor(diff / 60000))}m left`;
  if (hours < 24) return `${hours}h left`;
  return `${Math.floor(hours / 24)}d left`;
}

function formatTime(iso: string | number) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function ThreadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const bottomBarPadding = insets.bottom + Spacing.md;
  const scrollBottomSpacer = 120 + insets.bottom;
  const [post, setPost] = useState<Post | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [viewer, setViewer] = useState<PostViewer | null>(null);
  const [error, setError] = useState('');

  const loadPost = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    try {
      const token = await getTokenAsync();
      const res = await fetch(`${API_URL}/api/posts/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const d = await res.json();
      if (d.ok) {
        setPost(d.post);
        if (d.viewer) setViewer(d.viewer as PostViewer);
        else setViewer(null);
        setError('');
      } else {
        setError('Could not load post');
      }
    } catch {
      setError('Network error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    getSession().then(setCurrentUser);
    void loadPost();
  }, [loadPost]);

  useFocusEffect(
    useCallback(() => {
      void loadPost(true);
    }, [loadPost]),
  );

  const isOwnPost = currentUser != null && post != null && currentUser.id === post.author.userId;
  const isOpen = post?.status === 'open';
  const hasResponded = submitted || viewer?.hasResponded === true;
  const conversationId = viewer?.conversationId;
  const blockedByActiveHelp = viewer?.blockedByActiveHelp;
  const canRespond = isOpen && !isOwnPost && !hasResponded && !blockedByActiveHelp;

  const handleMarkDone = async () => {
    if (!post || closing || !isOwnPost) return;
    Alert.alert('Mark as done?', 'This will remove your post from the feed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark done',
        onPress: async () => {
          setClosing(true);
          try {
            const res = await api.posts.$close(post.id);
            if (res.ok) {
              const data = await res.json() as { post: Post };
              setPost(data.post);
            } else {
              Alert.alert('Error', 'Could not close post');
            }
          } catch {
            Alert.alert('Error', 'Network error');
          } finally {
            setClosing(false);
          }
        },
      },
    ]);
  };

  const handleShare = async () => {
    if (!post) return;
    const headline = displayPostTitle(post.title, post.body, post.category);
    const subtitle = displayPostBody(post.title, post.body);
    try {
      await Share.share({
        message: subtitle
          ? `${headline}\n\n${subtitle}\n\n— via SmallJobs`
          : `${headline}\n\n— via SmallJobs`,
      });
    } catch {}
  };

  const handleInterested = async () => {
    if (submitting || isOwnPost || !post) return;
    if (hasResponded && conversationId) {
      navigateAfterJoin(post, conversationId);
      return;
    }
    if (!canRespond) return;
    setSubmitting(true);
    try {
      const token = await getTokenAsync();
      if (!token) {
        Alert.alert('Sign in required', 'Please sign in to respond to posts.');
        setSubmitting(false);
        return;
      }
      const res = await fetch(`${API_URL}/api/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ postId: id, message: "I'm interested! Let's connect." }),
      });
      const data = await res.json() as {
        ok?: boolean;
        message?: string;
        conversationId?: string;
        activeHelp?: {
          postId: string;
          postTitle: string;
          conversationId?: string;
          responseId: string;
          lat?: number | null;
          lng?: number | null;
          category?: string;
          type?: string;
        };
      };
      if (res.ok && data.ok && data.conversationId) {
        setSubmitted(true);
        setViewer({ hasResponded: true, conversationId: data.conversationId });
        setPost(p => p ? { ...p, responseCount: p.responseCount + 1 } : p);
        navigateAfterJoin(post, data.conversationId);
      } else if (res.status === 409 && data.conversationId) {
        setSubmitted(true);
        setViewer({ hasResponded: true, conversationId: data.conversationId });
        navigateAfterJoin(post, data.conversationId);
      } else if (res.status === 409 && data.activeHelp) {
        Alert.alert(
          'Finish current help first',
          `You're already helping with "${data.activeHelp.postTitle}". Complete that trip before joining another local task.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'View route',
              onPress: () => {
                if (data.activeHelp) {
                  navigateToExploreRoute(
                    {
                      id: data.activeHelp.postId,
                      title: data.activeHelp.postTitle,
                      lat: data.activeHelp.lat,
                      lng: data.activeHelp.lng,
                      category: data.activeHelp.category,
                      type: data.activeHelp.type,
                    },
                    data.activeHelp.conversationId,
                  );
                }
              },
            },
          ],
        );
      } else {
        Alert.alert('Error', data.message ?? 'Could not send response');
      }
    } catch {
      Alert.alert('Error', 'Network error, please try again');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewRoute = () => {
    if (!post) return;
    navigateToExploreRoute(post, conversationId);
  };

  const handleGoToActiveHelp = () => {
    if (!blockedByActiveHelp) return;
    navigateToExploreRoute(
      {
        id: blockedByActiveHelp.postId,
        title: blockedByActiveHelp.postTitle,
        lat: blockedByActiveHelp.lat,
        lng: blockedByActiveHelp.lng,
        category: blockedByActiveHelp.category,
        type: blockedByActiveHelp.type,
      },
      blockedByActiveHelp.conversationId,
    );
  };

  const handleMessage = () => {
    if (!conversationId) return;
    router.push(`/chat/${conversationId}` as any);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={Colors.textPrimary} weight="bold" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thread</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !post) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={Colors.textPrimary} weight="bold" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thread</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.center}>
          <Text style={{ color: Colors.textSecondary }}>{error || 'Post not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const authorInitials = initials(post.author.name);
  const headline = displayPostTitle(post.title, post.body, post.category);
  const subtitle = displayPostBody(post.title, post.body);
  const joinLabel = isNavigablePost(post) ? 'Join & Navigate' : "I'm Interested";

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.textPrimary} weight="bold" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thread</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
            <ShareNetwork size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.mainCard}>
          <View style={styles.badgesRow}>
            <View style={[styles.badge, { backgroundColor: Colors.surfaceSoft }]}>
              {post.type === 'local'
                ? <MapPin size={11} color={Colors.textSecondary} weight="fill" />
                : <Globe size={11} color={Colors.info} weight="fill" />}
              <Text style={styles.badgeText}>
                {post.type === 'local' ? 'Nearby' : post.type === 'remote' ? 'Remote' : 'Interest'}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: post.isPaid ? Colors.successSurface : '#F0F0F0' }]}>
              {post.isPaid && <CurrencyCircleDollar size={11} color={Colors.success} weight="fill" />}
              <Text style={[styles.badgeText, { color: post.isPaid ? Colors.success : Colors.textSecondary }]}>
                {post.isPaid && post.amount ? `₹${post.amount}` : 'Free'}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#F0F0F0' }]}>
              <Clock size={11} color={Colors.textSecondary} />
              <Text style={styles.badgeText}>
                {post.status === 'open' && post.expiresAt
                  ? formatExpiresIn(post.expiresAt)
                  : post.status === 'expired'
                    ? 'Expired'
                    : post.status === 'closed'
                      ? 'Closed'
                      : formatTime(post.createdAt)}
              </Text>
            </View>
            {post.urgency === 'asap' && post.status === 'open' && (
              <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.badgeText, { color: '#B91C1C' }]}>Urgent</Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{headline}</Text>
          {subtitle ? <Text style={styles.body}>{subtitle}</Text> : null}

          {(post.tags ?? []).length > 0 && (
            <View style={styles.tagsRow}>
              {(post.tags ?? []).map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.posterCard}>
          <Text style={styles.sectionLabel}>Posted by</Text>
          <View style={styles.posterRow}>
            <View style={styles.posterAvatar}>
              {post.author.avatar
                ? null
                : <Text style={styles.posterAvatarText}>{authorInitials}</Text>}
            </View>
            <View style={styles.posterInfo}>
              <Text style={styles.posterName}>{post.author.name}</Text>
              <View style={styles.ratingRow}>
                <Star size={12} color="#F59E0B" weight="fill" />
                <Text style={styles.ratingText}>New member</Text>
              </View>
            </View>
            {!isOwnPost && (
              <TouchableOpacity
                style={styles.viewProfileBtn}
                onPress={() => router.push(`/user/${post.author.userId}` as any)}
              >
                <Text style={styles.viewProfileText}>View Profile</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.responseCard}>
          <ChatCircle size={18} color={Colors.textPrimary} weight="fill" />
          <Text style={styles.responseText}>
            <Text style={{ fontFamily: Font.sansSemibold, color: Colors.textPrimary }}>
              {post.responseCount} {post.responseCount === 1 ? 'person' : 'people'}
            </Text>
            {' '}have responded to this thread
          </Text>
        </View>

        <View style={{ height: scrollBottomSpacer }} />
      </ScrollView>

      {!isOwnPost && hasResponded && isOpen && (
        <View style={[styles.bottomBar, { paddingBottom: bottomBarPadding }]}>
          <View style={styles.ctaRow}>
            {post && isNavigablePost(post) && !viewer?.arrivedAt ? (
              <TouchableOpacity
                style={[styles.ctaBtn, styles.ctaBtnFlex]}
                activeOpacity={0.88}
                onPress={handleViewRoute}
              >
                <NavigationArrow size={18} color="#FFFFFF" weight="fill" />
                <Text style={styles.ctaBtnText}>View Route</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[
                isNavigablePost(post) && !viewer?.arrivedAt ? styles.secondaryBtn : styles.ctaBtn,
                styles.ctaBtnFlex,
                !conversationId && styles.ctaBtnDisabled,
              ]}
              activeOpacity={0.88}
              onPress={handleMessage}
              disabled={!conversationId}
            >
              <ChatCircle size={18} color={isNavigablePost(post) && !viewer?.arrivedAt ? Colors.textPrimary : '#FFFFFF'} weight="fill" />
              <Text style={[
                styles.ctaBtnText,
                isNavigablePost(post) && !viewer?.arrivedAt && styles.secondaryBtnText,
              ]}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!isOwnPost && !hasResponded && blockedByActiveHelp && (
        <View style={[styles.bottomBar, { paddingBottom: bottomBarPadding }]}>
          <View style={styles.ownPostPill}>
            <Text style={styles.ownPostText}>Finish current help first</Text>
          </View>
          <TouchableOpacity
            style={[styles.ctaBtn, { marginTop: Spacing.sm }]}
            activeOpacity={0.88}
            onPress={handleGoToActiveHelp}
          >
            <NavigationArrow size={18} color="#FFFFFF" weight="fill" />
            <Text style={styles.ctaBtnText}>View active route</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isOwnPost && !hasResponded && !blockedByActiveHelp && (
        <View style={[styles.bottomBar, { paddingBottom: bottomBarPadding }]}>
          <TouchableOpacity
            style={[styles.ctaBtn, (!canRespond || submitting) && styles.ctaBtnDisabled]}
            activeOpacity={0.88}
            onPress={handleInterested}
            disabled={!canRespond || submitting}
          >
            {submitting
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <PaperPlaneTilt size={18} color="#FFFFFF" weight="fill" />}
            <Text style={styles.ctaBtnText}>
              {!isOpen
                ? post.status === 'expired' ? 'Expired' : 'Closed'
                : submitting ? 'Sending...' : joinLabel}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {!isOwnPost && !hasResponded && !blockedByActiveHelp && !isOpen && (
        <View style={[styles.bottomBar, { paddingBottom: bottomBarPadding }]}>
          <View style={styles.ownPostPill}>
            <Text style={styles.ownPostText}>
              {post.status === 'expired' ? 'This post expired' : 'This post is closed'}
            </Text>
          </View>
        </View>
      )}

      {isOwnPost && isOpen && (
        <View style={[styles.bottomBar, { paddingBottom: bottomBarPadding }]}>
          <TouchableOpacity
            style={[styles.ctaBtn, closing && styles.ctaBtnDisabled]}
            activeOpacity={0.88}
            onPress={handleMarkDone}
            disabled={closing}
          >
            {closing
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <CheckCircle size={18} color="#FFFFFF" weight="fill" />}
            <Text style={styles.ctaBtnText}>
              {closing ? 'Closing...' : 'Mark as Done'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {isOwnPost && !isOpen && (
        <View style={[styles.bottomBar, { paddingBottom: bottomBarPadding }]}>
          <View style={styles.ownPostPill}>
            <Text style={styles.ownPostText}>
              {post.status === 'expired' ? 'This post expired' : 'This post is closed'}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.background,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSoft, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: FontSize.body, fontFamily: Font.sansSemibold, color: Colors.textPrimary },
  headerActions: { flexDirection: 'row', gap: Spacing.sm },
  iconBtn: {
    width: 38, height: 38, borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSoft, alignItems: 'center', justifyContent: 'center',
  },
  scroll: { flex: 1 },
  mainCard: {
    margin: Spacing.screenH, backgroundColor: Colors.surfaceSoft,
    borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.md, ...Shadows.sm,
  },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: Radius.xs,
  },
  badgeText: { fontSize: FontSize.caption, fontFamily: Font.sansMedium, color: Colors.textSecondary },
  title: {
    fontSize: FontSize.heading, fontFamily: Font.sansBold,
    color: Colors.textPrimary, lineHeight: 30, letterSpacing: -0.4,
  },
  body: { fontSize: FontSize.bodyL, fontFamily: Font.sans, color: Colors.textSecondary, lineHeight: 26 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs },
  tag: { backgroundColor: '#EBEBEB', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: FontSize.caption, fontFamily: Font.sansMedium, color: Colors.textPrimary },
  posterCard: {
    marginHorizontal: Spacing.screenH, backgroundColor: Colors.background,
    borderRadius: Radius.lg, padding: Spacing.base,
    borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm, marginBottom: Spacing.md, ...Shadows.xs,
  },
  sectionLabel: {
    fontSize: FontSize.caption, fontFamily: Font.sansMedium, color: Colors.textPlaceholder,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  posterRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  posterAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#E8E8E8', alignItems: 'center', justifyContent: 'center',
  },
  posterAvatarText: { fontSize: FontSize.body, fontFamily: Font.sansSemibold, color: Colors.textPrimary },
  posterInfo: { flex: 1 },
  posterName: { fontSize: FontSize.body, fontFamily: Font.sansSemibold, color: Colors.textPrimary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { fontSize: FontSize.caption, fontFamily: Font.sans, color: Colors.textSecondary },
  viewProfileBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.pill, borderWidth: 1.5, borderColor: Colors.border,
  },
  viewProfileText: { fontSize: FontSize.caption, fontFamily: Font.sansSemibold, color: Colors.textPrimary },
  responseCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginHorizontal: Spacing.screenH, backgroundColor: Colors.surfaceSoft,
    borderRadius: Radius.lg, padding: Spacing.base, marginBottom: Spacing.md,
  },
  responseText: { fontSize: FontSize.bodyS, fontFamily: Font.sans, color: Colors.textSecondary, flex: 1, lineHeight: 20 },
  bottomBar: {
    backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border,
    paddingHorizontal: Spacing.screenH, paddingTop: Spacing.md,
  },
  ctaRow: { flexDirection: 'row', gap: Spacing.sm },
  ctaBtnFlex: { flex: 1 },
  secondaryBtn: {
    backgroundColor: Colors.surfaceSoft, borderRadius: Radius.pill, height: 52,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  secondaryBtnText: { color: Colors.textPrimary },
  ctaBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.pill, height: 52,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  ctaBtnDisabled: { backgroundColor: Colors.textPlaceholder },
  ctaBtnText: { fontSize: FontSize.bodyL, fontFamily: Font.sansSemibold, color: '#FFFFFF' },
  ownPostPill: {
    backgroundColor: Colors.surfaceSoft, borderRadius: Radius.pill, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  ownPostText: { fontSize: FontSize.body, fontFamily: Font.sansMedium, color: Colors.textSecondary },
});
