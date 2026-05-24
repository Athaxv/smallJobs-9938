import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { MapPin, Globe, CurrencyCircleDollar, ArrowRight, ChatCircle } from 'phosphor-react-native';
import { Colors, Radius, Spacing, FontSize, Font, Shadows } from '../lib/theme';
import type { Thread } from '../lib/mockData';
import { displayPostTitle, displayPostBody } from '../lib/postDisplay';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ThreadCardProps {
  thread: Thread;
  onPress: () => void;
  variant?: 'standard' | 'featured' | 'compact' | 'own';
}

function getCtaLabel(category: string): string {
  const c = (category || '').toLowerCase();
  if (c.includes('errand') || c.includes('food') || c.includes('delivery')) return 'Help Out';
  if (c.includes('walk') || c.includes('hangout') || c.includes('meetup')) return 'Join';
  if (c.includes('study') || c.includes('remote') || c.includes('tutor')) return "I'm Interested";
  if (c.includes('creative') || c.includes('design') || c.includes('art')) return 'Apply';
  if (c.includes('chat') || c.includes('interest') || c.includes('hobby')) return 'Connect';
  return "I'm Interested";
}

function AvatarBubble({ initials, size = 28 }: { initials: string; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

function Badge({ type, amount }: { type: 'paid' | 'free' | 'local' | 'remote' | 'interest'; amount?: number }) {
  const config = {
    paid:     { bg: Colors.successSurface, text: Colors.success, label: amount ? `₹${amount}` : 'Paid' },
    free:     { bg: '#F0F0F0',             text: Colors.textSecondary, label: 'Free' },
    local:    { bg: '#EBEBEB',             text: Colors.textPrimary, label: 'Nearby' },
    remote:   { bg: Colors.infoSurface,   text: Colors.info,   label: 'Remote' },
    interest: { bg: '#F5F3FF',            text: '#8B5CF6',     label: 'Interest' },
  }[type];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      {type === 'local'  && <MapPin size={9} color={config.text} weight="fill" />}
      {type === 'remote' && <Globe size={9} color={config.text} weight="fill" />}
      {type === 'paid'   && <CurrencyCircleDollar size={9} color={config.text} weight="fill" />}
      <Text style={[styles.badgeText, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

export default function ThreadCard({ thread, onPress, variant = 'standard' }: ThreadCardProps) {
  const isFeatured = variant === 'featured';
  const isOwn = variant === 'own';
  const isCompact = variant === 'compact';
  const ctaLabel = getCtaLabel(thread.category ?? thread.type);
  const headline = displayPostTitle(thread.title, thread.body, thread.category);
  const subtitle = displayPostBody(thread.title, thread.body);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={[styles.card, isFeatured && styles.featuredCard, isCompact && styles.compactCard]}
    >
      <View style={styles.inner}>
        {/* Top row */}
        <View style={styles.topRow}>
          <AvatarBubble initials={thread.author.avatar} size={isFeatured ? 32 : 26} />
          <View style={styles.authorInfo}>
            <Text style={styles.authorName}>{thread.author.name}</Text>
            <Text style={styles.timestamp}>{thread.createdAt}</Text>
          </View>
          {isOwn && (
            <View style={[styles.statusPill, { backgroundColor: thread.status === 'open' ? Colors.successSurface : '#F0F0F0' }]}>
              <Text style={[styles.statusText, { color: thread.status === 'open' ? Colors.success : Colors.textSecondary }]}>
                {thread.status === 'open' ? 'Open' : thread.status === 'closed' ? 'Closed' : 'Expired'}
              </Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={[styles.title, isFeatured && styles.titleFeatured]} numberOfLines={2}>
          {headline}
        </Text>

        {/* Body — hidden when empty or redundant with title */}
        {!isCompact && subtitle && (
          <Text style={styles.body} numberOfLines={2}>{subtitle}</Text>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.badgeRow}>
            <Badge type={thread.isPaid ? 'paid' : 'free'} amount={thread.amount} />
            <Badge type={thread.type} />
            {thread.distance && (
              <View style={styles.distanceChip}>
                <MapPin size={9} color={Colors.textPlaceholder} weight="fill" />
                <Text style={styles.distanceText}>{thread.distance}</Text>
              </View>
            )}
          </View>
          <View style={styles.footerRight}>
            <ChatCircle size={12} color={Colors.textSecondary} />
            <Text style={styles.responseCount}>{thread.responseCount}</Text>
          </View>
        </View>

        {/* CTA */}
        {!isCompact && !isOwn && (
          <View style={styles.ctaRow}>
            <TouchableOpacity style={styles.ctaButton} activeOpacity={0.75} onPress={onPress}>
              <Text style={styles.ctaText}>{ctaLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.arrowBtn} onPress={onPress}>
              <ArrowRight size={14} color={Colors.primary} weight="bold" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    // No overflow:hidden — it clips shadows and rounded corners on Android
    ...Shadows.sm,
  },
  featuredCard: {
    backgroundColor: Colors.surfaceSoft,
    borderWidth: 0,
    borderRadius: Radius.xl,
    width: SCREEN_WIDTH * 0.8,
    ...Shadows.md,
  },
  compactCard: { borderRadius: Radius.md },
  inner: { padding: 12, gap: 6 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: {
    backgroundColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.textPrimary,
    fontFamily: Font.sansSemibold,
    letterSpacing: 0.3,
  },
  authorInfo: { flex: 1 },
  authorName: { fontSize: FontSize.caption, fontFamily: Font.sansMedium, color: Colors.textPrimary },
  timestamp: { fontSize: 10, fontFamily: Font.sans, color: Colors.textPlaceholder, marginTop: 1 },
  statusPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.pill },
  statusText: { fontSize: FontSize.caption, fontFamily: Font.sansMedium },
  title: {
    fontSize: FontSize.body,
    fontFamily: Font.sansSemibold,
    color: Colors.textPrimary,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  titleFeatured: { fontSize: FontSize.bodyL, lineHeight: 23 },
  body: { fontSize: FontSize.caption, fontFamily: Font.sans, color: Colors.textSecondary, lineHeight: 18 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  badgeRow: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'center', flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  badgeText: { fontSize: 10, fontFamily: Font.sansMedium },
  distanceChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  distanceText: { fontSize: 10, fontFamily: Font.sans, color: Colors.textSecondary },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  responseCount: { fontSize: 10, fontFamily: Font.sans, color: Colors.textSecondary },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  ctaButton: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: Colors.primary,
  },
  ctaText: { fontSize: FontSize.caption, fontFamily: Font.sansSemibold, color: '#fff', letterSpacing: 0.2 },
  arrowBtn: { padding: 4 },
});
