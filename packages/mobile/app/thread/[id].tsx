import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft, MapPin, Globe, CurrencyCircleDollar, Clock,
  Star, ChatCircle, PaperPlaneTilt, Heart, ShareNetwork,
} from 'phosphor-react-native';
import { Colors, Spacing, FontSize, Font, Radius, Shadows } from '../../lib/theme';
import { API_URL } from '../../lib/config';
import { getTokenAsync } from '../../lib/auth';

interface Post {
  id: string;
  title: string;
  body: string;
  type: 'local' | 'remote' | 'interest';
  isPaid: boolean;
  amount: number | null;
  tags: string[] | null;
  responseCount: number;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

function formatTime(iso: string) {
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
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getTokenAsync().then(token =>
    fetch(`${API_URL}/api/posts/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }))
      .then(r => r.json())
      .then(d => {
        if (d.ok) setPost(d.post);
        else setError('Could not load post');
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleInterested = async () => {
    if (submitting || submitted) return;
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
      const data = await res.json();
      if (res.ok && data.ok) {
        setSubmitted(true);
        setPost(p => p ? { ...p, responseCount: p.responseCount + 1 } : p);
        // Navigate to the conversation that was created automatically
        router.push(`/chat/${data.conversationId}` as any);
      } else {
        Alert.alert('Error', data.message ?? 'Could not send response');
      }
    } catch {
      Alert.alert('Error', 'Network error, please try again');
    } finally {
      setSubmitting(false);
    }
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

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.textPrimary} weight="bold" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thread</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn}>
            <Heart size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
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
              <Text style={styles.badgeText}>{formatTime(post.createdAt)}</Text>
            </View>
          </View>

          <Text style={styles.title}>{post.title}</Text>
          <Text style={styles.body}>{post.body}</Text>

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
            <TouchableOpacity style={styles.viewProfileBtn}>
              <Text style={styles.viewProfileText}>View Profile</Text>
            </TouchableOpacity>
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

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.ctaBtn, (submitting || submitted) && styles.ctaBtnDisabled]}
          activeOpacity={0.88}
          onPress={handleInterested}
          disabled={submitting || submitted}
        >
          {submitting
            ? <ActivityIndicator size="small" color="#FFFFFF" />
            : <PaperPlaneTilt size={18} color="#FFFFFF" weight="fill" />}
          <Text style={styles.ctaBtnText}>
            {submitted ? 'Request Sent!' : submitting ? 'Sending...' : "I'm Interested"}
          </Text>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: Spacing.screenH, paddingTop: Spacing.md, paddingBottom: Spacing.xl,
  },
  ctaBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.pill, height: 52,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  ctaBtnDisabled: { backgroundColor: Colors.textPlaceholder },
  ctaBtnText: { fontSize: FontSize.bodyL, fontFamily: Font.sansSemibold, color: '#FFFFFF' },
});
