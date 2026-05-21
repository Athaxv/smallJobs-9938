import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Sparkle, MapPin, Globe, CurrencyCircleDollar,
  Clock, PencilSimple, RocketLaunch,
} from 'phosphor-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, FontSize, Radius, Shadows, Font } from '../../lib/theme';
import { api } from '../../lib/api';

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ??
  'https://b588iqpvtru3uh0q4bcng-preview-4200.runable.site/';

interface StructuredThread {
  title: string;
  body: string;
  type: 'local' | 'remote' | 'interest';
  category: string;
  tags: string[];
  isPaid: boolean;
  amount?: number;
  urgency: 'asap' | 'today' | 'this_week' | 'flexible';
  visibility: string;
}

const URGENCY_LABELS: Record<string, string> = {
  asap: 'ASAP',
  today: 'Today',
  this_week: 'This week',
  flexible: 'Flexible',
};

function buildFallback(request: string, answers: string[]): StructuredThread {
  const lower = request.toLowerCase();
  let type: 'local' | 'remote' | 'interest' = 'remote';
  let category = 'General';
  let tags: string[] = [];
  let visibility = 'Shown to everyone online';

  if (lower.includes('walk') || lower.includes('groceri') || lower.includes('pickup') || lower.includes('hangout')) {
    type = 'local'; visibility = 'Shown to users within 2 km';
  }
  if (lower.includes('manhwa') || lower.includes('manga') || lower.includes('anime')) {
    type = 'interest'; visibility = 'Shown to users with matching interests'; tags = ['fandom', 'interest'];
  }
  if (lower.includes('assign') || lower.includes('write')) { category = 'Study Help'; tags = ['assignment', 'writing']; }
  if (lower.includes('walk')) { category = 'Walk & Sport'; tags = ['walk', 'casual']; }
  if (lower.includes('groceri')) { category = 'Errands'; tags = ['grocery', 'pickup']; }
  if (lower.includes('hang')) { category = 'Hangout'; tags = ['hangout', 'casual']; }

  const paidAnswer = answers.find(a => a.includes('₹') || a.toLowerCase().includes('pay'));
  let isPaid = false;
  let amount: number | undefined;
  if (paidAnswer && !paidAnswer.toLowerCase().includes('not') && !paidAnswer.toLowerCase().includes('free')) {
    isPaid = true;
    const match = paidAnswer.match(/₹(\d+)/);
    amount = match ? parseInt(match[1]) : 300;
  }

  return {
    title: request.length > 70 ? request.substring(0, 67) + '...' : request,
    body: request,
    type,
    category,
    tags,
    isPaid,
    amount,
    urgency: 'flexible',
    visibility,
  };
}

export default function ThreadPreviewScreen() {
  const { request, answers: answersRaw } =
    useLocalSearchParams<{ request: string; answers: string }>();
  const answers = JSON.parse(answersRaw ?? '[]') as string[];

  const [thread, setThread] = useState<StructuredThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [aiFallback, setAiFallback] = useState(false);

  useEffect(() => { structureThread(); }, []);

  const structureThread = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}api/ai/structure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request, answers }),
        credentials: 'include',
      });
      const data = await res.json() as { ok: boolean; thread?: StructuredThread };
      if (data.ok && data.thread) {
        setThread(data.thread);
      } else {
        setThread(buildFallback(request ?? '', answers));
        setAiFallback(true);
      }
    } catch {
      setThread(buildFallback(request ?? '', answers));
      setAiFallback(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!thread || posting) return;
    setPosting(true);
    try {
      const res = await api.posts.$post({
        json: {
          title: thread.title,
          body: thread.body,
          category: thread.category,
          type: thread.type,
          isPaid: thread.isPaid,
          amount: thread.amount,
          urgency: thread.urgency,
          visibility: thread.visibility,
          tags: thread.tags,
        },
      });

      if (!res.ok) {
        const err = await res.json() as { message?: string };
        Alert.alert('Error', err.message ?? 'Failed to post. Try again.');
        return;
      }

      const data = await res.json() as { ok: boolean; post: { id: string } };
      router.replace({
        pathname: '/post/success',
        params: { postId: data.post.id, urgency: thread.urgency },
      });
    } catch (e) {
      Alert.alert('Error', 'Network error. Check your connection and try again.');
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIconWrap}>
            <Sparkle size={28} color={Colors.textPrimary} weight="fill" />
          </View>
          <Text style={styles.loadingTitle}>Structuring your thread...</Text>
          <Text style={styles.loadingSubtitle}>AI is crafting the perfect post</Text>
          <ActivityIndicator size="large" color={Colors.textPrimary} style={{ marginTop: Spacing.lg }} />
        </View>
      </SafeAreaView>
    );
  }

  if (!thread) return null;

  const accentColor =
    thread.type === 'local' ? Colors.textPrimary :
    thread.type === 'remote' ? Colors.info : '#8B5CF6';
  const typeBg =
    thread.type === 'local' ? '#EBEBEB' :
    thread.type === 'remote' ? Colors.infoSurface : '#F5F3FF';
  const typeLabel =
    thread.type === 'local' ? 'Nearby' :
    thread.type === 'remote' ? 'Remote' : 'Interest';
  const expireLabel =
    thread.urgency === 'asap' ? '2 hours' :
    thread.urgency === 'today' ? '24 hours' :
    thread.urgency === 'this_week' ? '7 days' : '3 days';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.textPrimary} weight="bold" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Sparkle size={14} color={Colors.textPrimary} weight="fill" />
          <Text style={styles.headerTitle}>Preview Thread</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.aiStrip}>
          <Sparkle size={13} color={Colors.textPrimary} weight="fill" />
          <Text style={styles.aiStripText}>
            {aiFallback
              ? 'AI structured your request (offline fallback). Review before posting.'
              : 'AI has structured your request. Review before posting.'}
          </Text>
        </View>

        <View style={styles.previewCard}>
          <View style={styles.previewInner}>
            <View style={styles.badgesRow}>
              <View style={[styles.badge, { backgroundColor: typeBg }]}>
                {thread.type === 'local'
                  ? <MapPin size={10} color={accentColor} weight="fill" />
                  : <Globe size={10} color={accentColor} weight="fill" />}
                <Text style={[styles.badgeText, { color: accentColor }]}>{typeLabel}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: thread.isPaid ? Colors.successSurface : '#F5F5F5' }]}>
                {thread.isPaid && <CurrencyCircleDollar size={10} color={Colors.success} weight="fill" />}
                <Text style={[styles.badgeText, { color: thread.isPaid ? Colors.success : Colors.textSecondary }]}>
                  {thread.isPaid && thread.amount ? `₹${thread.amount}` : 'Free'}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: '#F5F5F5' }]}>
                <Text style={[styles.badgeText, { color: Colors.textSecondary }]}>{thread.category}</Text>
              </View>
            </View>

            <Text style={styles.previewTitle}>{thread.title}</Text>
            <Text style={styles.previewBody}>{thread.body}</Text>

            {(thread.tags ?? []).length > 0 && (
              <View style={styles.tagsRow}>
                {(thread.tags ?? []).map(t => (
                  <View key={t} style={styles.tag}>
                    <Text style={styles.tagText}>#{t}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.visibilityCard}>
          <View style={styles.visibilityRow}>
            {thread.type === 'local'
              ? <MapPin size={16} color={Colors.textPrimary} weight="fill" />
              : <Globe size={16} color={Colors.info} weight="fill" />}
            <View style={styles.visibilityInfo}>
              <Text style={styles.visibilityTitle}>Visibility</Text>
              <Text style={styles.visibilityText}>{thread.visibility}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.visibilityRow}>
            <Clock size={16} color={Colors.textSecondary} />
            <View style={styles.visibilityInfo}>
              <Text style={styles.visibilityTitle}>Urgency · Expires</Text>
              <Text style={styles.visibilityText}>
                {URGENCY_LABELS[thread.urgency]} · auto-closes in {expireLabel}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.editRow} onPress={() => router.back()}>
          <PencilSimple size={16} color={Colors.textSecondary} />
          <Text style={styles.editText}>Something wrong? Go back and edit</Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.ctaBtn, posting && styles.ctaBtnDisabled]}
          activeOpacity={0.88}
          onPress={handlePost}
          disabled={posting}
        >
          {posting
            ? <ActivityIndicator size="small" color="#FFFFFF" />
            : <RocketLaunch size={18} color="#FFFFFF" weight="fill" />}
          <Text style={styles.ctaBtnText}>{posting ? 'Posting...' : 'Post Thread'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: Spacing.md, paddingHorizontal: Spacing.screenH,
  },
  loadingIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.surfaceSoft, alignItems: 'center', justifyContent: 'center',
  },
  loadingTitle: {
    fontSize: FontSize.subheading, fontFamily: Font.sansSemibold,
    color: Colors.textPrimary, textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: FontSize.body, fontFamily: Font.sans,
    color: Colors.textSecondary, textAlign: 'center',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSoft, alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  headerTitle: { fontSize: FontSize.body, fontFamily: Font.sansSemibold, color: Colors.textPrimary },
  aiStrip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    margin: Spacing.screenH, backgroundColor: Colors.surfaceSoft,
    borderRadius: Radius.md, padding: Spacing.md,
  },
  aiStripText: {
    fontSize: FontSize.bodyS, fontFamily: Font.sans,
    color: Colors.textSecondary, flex: 1, lineHeight: 20,
  },
  previewCard: {
    marginHorizontal: Spacing.screenH, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
    backgroundColor: Colors.background, ...Shadows.md, marginBottom: Spacing.md,
  },
  previewInner: { padding: Spacing.lg, gap: Spacing.md },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.xs,
  },
  badgeText: { fontSize: FontSize.caption, fontFamily: Font.sansMedium },
  previewTitle: {
    fontSize: FontSize.subheading, fontFamily: Font.sansSemibold,
    color: Colors.textPrimary, lineHeight: 26, letterSpacing: -0.3,
  },
  previewBody: { fontSize: FontSize.body, fontFamily: Font.sans, color: Colors.textSecondary, lineHeight: 22 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  tag: { backgroundColor: '#EBEBEB', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: FontSize.caption, fontFamily: Font.sansMedium, color: Colors.textPrimary },
  visibilityCard: {
    marginHorizontal: Spacing.screenH, backgroundColor: Colors.surfaceSoft,
    borderRadius: Radius.lg, padding: Spacing.base, gap: Spacing.md, marginBottom: Spacing.md,
  },
  visibilityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  visibilityInfo: { flex: 1 },
  visibilityTitle: { fontSize: FontSize.bodyS, fontFamily: Font.sansSemibold, color: Colors.textPrimary },
  visibilityText: {
    fontSize: FontSize.caption, fontFamily: Font.sans,
    color: Colors.textSecondary, marginTop: 2, lineHeight: 18,
  },
  divider: { height: 1, backgroundColor: Colors.border },
  editRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    justifyContent: 'center', paddingVertical: Spacing.base,
  },
  editText: {
    fontSize: FontSize.bodyS, fontFamily: Font.sans,
    color: Colors.textSecondary, textDecorationLine: 'underline',
  },
  bottomBar: {
    paddingHorizontal: Spacing.screenH, paddingTop: Spacing.md, paddingBottom: Spacing.xl,
    backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  ctaBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.pill, height: 52,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  ctaBtnDisabled: { opacity: 0.6 },
  ctaBtnText: { fontSize: FontSize.bodyL, fontFamily: Font.sansSemibold, color: '#FFFFFF' },
});
