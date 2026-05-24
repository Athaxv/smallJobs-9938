import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
  TextInput, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, MagnifyingGlass, SlidersHorizontal, MapPin, X } from 'phosphor-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, Font, Radius } from '../../lib/theme';
import ThreadCard from '../../components/ThreadCard';
import { CATEGORIES } from '../../lib/mockData';
import { api, profileApi } from '../../lib/api';
import { getSession, type AuthUser } from '../../lib/auth';

type FilterKey = 'all' | 'paid' | 'free' | 'urgent' | string;

interface FilterTag {
  key: FilterKey;
  label: string;
  emoji?: string;
}

const QUICK_FILTERS: FilterTag[] = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'free', label: 'Free' },
  { key: 'urgent', label: 'Urgent' },
];

interface PostFromAPI {
  id: string;
  title: string;
  body: string;
  type: 'local' | 'remote' | 'interest';
  category: string;
  tags?: string[];
  isPaid: boolean;
  amount?: number | null;
  distance?: string | null;
  status: string;
  responseCount: number;
  createdAt: string | number;
  author: {
    userId: string;
    name: string;
    avatar: string | null;
    location: string | null;
    rating: number;
  };
}

function toThreadCardFormat(p: PostFromAPI) {
  return {
    id: p.id,
    title: p.title,
    body: p.body,
    type: p.type,
    category: p.category,
    tags: p.tags ?? [],
    isPaid: p.isPaid,
    amount: p.amount ?? undefined,
    distance: p.distance ?? undefined,
    status: p.status as 'open' | 'closed' | 'expired',
    responseCount: p.responseCount,
    createdAt: new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    author: {
      id: p.author.userId,
      name: p.author.name,
      avatar: p.author.avatar ?? p.author.name.charAt(0).toUpperCase(),
      rating: p.author.rating,
    },
  };
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [userLocation, setUserLocation] = React.useState<string | null>(null);

  React.useEffect(() => {
    getSession().then(setUser);
    // Fetch profile to get saved location
    profileApi.getMe().then(data => {
      if (data?.profile?.location) setUserLocation(data.profile.location);
    }).catch(() => {});
  }, []);

  const [posts, setPosts] = useState<PostFromAPI[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await api.posts.$get({ query: { limit: '40', page: '1' } });
      if (res.ok) {
        const data = await res.json() as { ok: boolean; posts: PostFromAPI[] };
        setPosts(data.posts ?? []);
      }
    } catch (e) {
      // silently fail — show empty state
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  }, [fetchPosts]);

  const filteredPosts = useMemo(() => {
    let result = posts;
    if (activeFilter === 'paid') result = result.filter(p => p.isPaid);
    else if (activeFilter === 'free') result = result.filter(p => !p.isPaid);
    else if (activeFilter === 'urgent') result = result.filter(p =>
      (p.tags ?? []).some(t => t === 'urgent') || p.category === 'emergency'
    );
    else if (activeFilter !== 'all') result = result.filter(p => p.category === activeFilter);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.author.name.toLowerCase().includes(q) ||
        (p.tags ?? []).some(t => t.toLowerCase().includes(q))
      );
    }

    return result;
  }, [posts, activeFilter, searchQuery]);

  const nearbyPosts = filteredPosts.filter(p => p.type === 'local');
  const remotePosts = filteredPosts.filter(p => p.type !== 'local');

  const allFilters: FilterTag[] = [
    ...QUICK_FILTERS,
    ...CATEGORIES.map(c => ({ key: c.id, label: c.label, emoji: c.emoji })),
  ];

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const avatarInitial = firstName.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#111" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>Hey, {firstName} 👋</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(tabs)/inbox')}>
              <Bell size={20} color={Colors.textPrimary} weight="regular" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.userAvatar} onPress={() => router.push('/(tabs)/profile')}>
              <Text style={styles.userAvatarText}>{avatarInitial}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Location strip */}
        <TouchableOpacity style={styles.locationStrip} onPress={() => router.push('/edit-profile')}>
          <MapPin size={14} color={Colors.textPrimary} weight="fill" />
          <Text style={styles.locationText}>{userLocation ?? 'Set your location'}</Text>
          <Text style={styles.locationChange}>{userLocation ? 'Change' : 'Add'}</Text>
        </TouchableOpacity>

        {/* Search bar */}
        <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
          <MagnifyingGlass size={18} color={searchFocused ? Colors.textPrimary : Colors.textPlaceholder} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search requests, people..."
            placeholderTextColor={Colors.textPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => { setSearchQuery(''); searchInputRef.current?.blur(); }}>
              <X size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <SlidersHorizontal size={18} color={Colors.textSecondary} />
          )}
        </View>

        {/* Filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContent}
        >
          {allFilters.map(f => {
            const isActive = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setActiveFilter(f.key)}
                activeOpacity={0.75}
              >
                {f.emoji && <Text style={styles.filterEmoji}>{f.emoji}</Text>}
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Loading state */}
        {loadingPosts && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.textPrimary} />
            <Text style={styles.loadingText}>Loading posts...</Text>
          </View>
        )}

        {/* Near You */}
        {!loadingPosts && nearbyPosts.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Near You</Text>
                <Text style={styles.sectionSub}>Within 2 km{userLocation ? ` · ${userLocation.split(',')[0]}` : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.featuredScroll}
              contentContainerStyle={styles.featuredContent}
            >
              {nearbyPosts.map(post => (
                <ThreadCard
                  key={post.id}
                  thread={toThreadCardFormat(post)}
                  variant="featured"
                  onPress={() => router.push(`/thread/${post.id}`)}
                />
              ))}
            </ScrollView>
          </>
        )}

        {/* Remote & Online */}
        {!loadingPosts && remotePosts.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: nearbyPosts.length > 0 ? Spacing.xl : Spacing.lg }]}>
              <View>
                <Text style={styles.sectionTitle}>Remote & Online</Text>
                <Text style={styles.sectionSub}>Open to everyone</Text>
              </View>
            </View>

            <View style={styles.threadList}>
              {remotePosts.map(post => (
                <ThreadCard
                  key={post.id}
                  thread={toThreadCardFormat(post)}
                  variant="standard"
                  onPress={() => router.push(`/thread/${post.id}`)}
                />
              ))}
            </View>
          </>
        )}

        {/* Empty state */}
        {!loadingPosts && filteredPosts.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptySub}>Be the first to post a request!</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  greeting: { fontSize: FontSize.caption, fontFamily: Font.sans, color: Colors.textSecondary, letterSpacing: 0.2 },
  name: { fontSize: FontSize.heading, fontFamily: Font.serif, color: Colors.textPrimary, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconBtn: {
    width: 40, height: 40, borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSoft, alignItems: 'center', justifyContent: 'center',
  },
  userAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#E8E8E8', alignItems: 'center', justifyContent: 'center',
  },
  userAvatarText: { fontSize: FontSize.body, fontFamily: Font.sansSemibold, color: Colors.textPrimary },
  locationStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: Spacing.screenH, paddingVertical: Spacing.xs, marginBottom: Spacing.sm,
  },
  locationText: { fontSize: FontSize.bodyS, fontFamily: Font.sans, color: Colors.textSecondary, flex: 1 },
  locationChange: { fontSize: FontSize.bodyS, fontFamily: Font.sansMedium, color: Colors.textPrimary },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceSoft, borderRadius: Radius.pill,
    height: 48, paddingHorizontal: Spacing.base,
    marginHorizontal: Spacing.screenH, gap: Spacing.sm,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  searchBarFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
  },
  searchInput: {
    flex: 1, fontSize: FontSize.body, fontFamily: Font.sans,
    color: Colors.textPrimary, height: '100%',
  },
  filtersScroll: { marginTop: Spacing.md },
  filtersContent: { paddingHorizontal: Spacing.screenH, gap: Spacing.sm, paddingBottom: 4 },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: Radius.pill, backgroundColor: Colors.background,
    borderWidth: 1.5, borderColor: Colors.border, gap: 5,
  },
  filterPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterEmoji: { fontSize: 13 },
  filterText: { fontSize: FontSize.bodyS, fontFamily: Font.sansMedium, color: Colors.textSecondary },
  filterTextActive: { color: '#fff' },
  loadingContainer: { alignItems: 'center', paddingTop: 60, gap: Spacing.md },
  loadingText: { fontSize: FontSize.body, fontFamily: Font.sans, color: Colors.textSecondary },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH, marginTop: Spacing.xl, marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.subheading, fontFamily: Font.serif,
    color: Colors.textPrimary, letterSpacing: -0.2,
  },
  sectionSub: { fontSize: FontSize.caption, fontFamily: Font.sans, color: Colors.textSecondary, marginTop: 2 },
  seeAll: { fontSize: FontSize.bodyS, fontFamily: Font.sansMedium, color: Colors.textPrimary },
  featuredScroll: { paddingLeft: Spacing.screenH, paddingVertical: 6 },
  featuredContent: { gap: Spacing.md, paddingRight: Spacing.screenH },
  threadList: { paddingHorizontal: Spacing.screenH, gap: Spacing.md, paddingVertical: 6 },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingBottom: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: FontSize.subheading, fontFamily: Font.sansSemibold, color: Colors.textPrimary, marginBottom: 6 },
  emptySub: { fontSize: FontSize.bodyS, fontFamily: Font.sans, color: Colors.textSecondary },
});
