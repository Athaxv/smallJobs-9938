import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, Font, Radius } from '../../lib/theme';
import { API_URL } from '../../lib/config';
import { getTokenAsync } from '../../lib/auth';

interface Conversation {
  id: string;
  postId: string;
  postTitle: string;
  otherUser: { name: string; avatar: string | null };
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

function formatTime(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function InboxScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = await getTokenAsync();
      const res = await fetch(`${API_URL}/api/messages/conversations`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.ok) setConversations(data.conversations);
    } catch {
      // fail silently on refresh
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations(true);
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={styles.title}>Inbox</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Inbox</Text>
        {totalUnread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{totalUnread} new</Text>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>When someone responds to your thread or you respond to one, it'll show here.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {conversations.map(conv => (
              <TouchableOpacity
                key={conv.id}
                style={[styles.card, conv.unreadCount > 0 && styles.cardUnread]}
                activeOpacity={0.88}
                onPress={() => router.push(`/chat/${conv.id}`)}
              >
                <View style={styles.avatarWrap}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials(conv.otherUser.name)}</Text>
                  </View>
                  {conv.unreadCount > 0 && <View style={styles.unreadDot} />}
                </View>
                <View style={styles.content}>
                  <View style={styles.topRow}>
                    <Text style={[styles.userName, conv.unreadCount > 0 && styles.userNameBold]} numberOfLines={1}>
                      {conv.otherUser.name}
                    </Text>
                    <Text style={styles.time}>{formatTime(conv.lastMessageAt)}</Text>
                  </View>
                  <Text style={styles.threadTitle} numberOfLines={1}>{conv.postTitle}</Text>
                  <Text
                    style={[styles.lastMessage, conv.unreadCount > 0 && styles.lastMessageBold]}
                    numberOfLines={1}
                  >
                    {conv.lastMessage ?? 'No messages yet'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.screenH, paddingTop: Spacing.md,
    paddingBottom: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: FontSize.displayL, fontFamily: Font.serif, color: Colors.textPrimary, letterSpacing: -0.5 },
  unreadBadge: { backgroundColor: '#F0F0F0', paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.pill },
  unreadText: { fontSize: FontSize.caption, fontFamily: Font.sansSemibold, color: Colors.textPrimary },
  list: { paddingTop: Spacing.sm },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.screenH, paddingVertical: Spacing.base,
    borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.background,
  },
  cardUnread: { backgroundColor: '#FAFAFA' },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#E8E8E8', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FontSize.body, fontFamily: Font.sansSemibold, color: Colors.textPrimary },
  unreadDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: Colors.primary, borderWidth: 2, borderColor: Colors.background,
  },
  content: { flex: 1, gap: 3 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userName: { fontSize: FontSize.body, fontFamily: Font.sansMedium, color: Colors.textPrimary, flex: 1 },
  userNameBold: { fontFamily: Font.sansSemibold },
  time: { fontSize: FontSize.caption, fontFamily: Font.sans, color: Colors.textPlaceholder, marginLeft: Spacing.sm },
  threadTitle: { fontSize: FontSize.caption, fontFamily: Font.sans, color: Colors.textSecondary, fontStyle: 'italic' },
  lastMessage: { fontSize: FontSize.bodyS, fontFamily: Font.sans, color: Colors.textSecondary },
  lastMessageBold: { color: Colors.textPrimary, fontFamily: Font.sansMedium },
  emptyState: {
    alignItems: 'center', paddingTop: 80, paddingHorizontal: Spacing.xxl, gap: Spacing.md,
  },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { fontSize: FontSize.subheading, fontFamily: Font.sansSemibold, color: Colors.textPrimary },
  emptySubtitle: { fontSize: FontSize.body, fontFamily: Font.sans, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
