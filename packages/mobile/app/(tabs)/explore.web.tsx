/**
 * Explore — Web fallback (no MapView)
 * react-native-maps has no web support, so this file is used instead on web.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { MapPin, MagnifyingGlass, Lightning } from 'phosphor-react-native';
import { router } from 'expo-router';
import { categoryEmoji, EXPLORE_FILTER_CATEGORIES } from '@template/web/categories';
import { Colors, Spacing, FontSize, Font, Radius, Shadows } from '../../lib/theme';
import { API_URL } from '../../lib/config';
import { displayPostTitle } from '../../lib/postDisplay';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NearbyPost {
  id: string;
  title: string;
  category: string;
  isPaid: boolean;
  amount: number | null;
  status: string;
  responseCount: number;
  createdAt: number;
  lat: number;
  lng: number;
  distanceKm: number;
  author: { userId: string; name: string; avatar: string | null; location: string | null; rating: number };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_LAT = 19.0760;
const DEFAULT_LNG = 72.8777;

const CATEGORIES = EXPLORE_FILTER_CATEGORIES;

function formatTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({ post }: { post: NearbyPost }) {
  const headline = displayPostTitle(post.title, undefined, post.category);
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/thread/${post.id}` as any)}
      activeOpacity={0.85}
    >
      <View style={styles.cardLeft}>
        <View style={styles.cardEmojiBg}>
          <Text style={styles.cardEmoji}>{categoryEmoji(post.category)}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{headline}</Text>
        <View style={styles.cardMeta}>
          <MapPin size={11} color={Colors.textSecondary} />
          <Text style={styles.cardMetaText}>{post.distanceKm} km away</Text>
          <View style={styles.dot} />
          <Text style={styles.cardMetaText}>{formatTime(post.createdAt)}</Text>
          {post.responseCount > 0 && (
            <>
              <View style={styles.dot} />
              <Text style={styles.cardMetaText}>{post.responseCount} response{post.responseCount !== 1 ? 's' : ''}</Text>
            </>
          )}
        </View>
      </View>
      {post.isPaid && post.amount ? (
        <View style={styles.rewardBadge}>
          <Text style={styles.rewardText}>₹{post.amount}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ExploreScreen() {
  const [posts, setPosts] = useState<NearbyPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [userLat, setUserLat] = useState(DEFAULT_LAT);
  const [userLng, setUserLng] = useState(DEFAULT_LNG);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLat(loc.coords.latitude);
        setUserLng(loc.coords.longitude);
      } catch {}
    })();
  }, []);

  const fetchNearby = useCallback(async (lat: number, lng: number, cat: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radius: '25',
        limit: '50',
      });
      if (cat !== 'all') params.set('category', cat);
      const res = await fetch(`${API_URL}/api/posts/nearby?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setPosts(data.posts);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNearby(userLat, userLng, activeCategory);
  }, [userLat, userLng, activeCategory, fetchNearby]);

  const filtered = search.trim()
    ? posts.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()))
    : posts;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MapPin size={18} color={Colors.textPrimary} weight="fill" />
          <Text style={styles.headerTitle}>Explore</Text>
        </View>
        {loading && <ActivityIndicator size="small" color={Colors.textPrimary} />}
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <MagnifyingGlass size={15} color={Colors.textPlaceholder} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search requests…"
          placeholderTextColor={Colors.textPlaceholder}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Category filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.filterPill, activeCategory === cat.id && styles.filterPillActive]}
            onPress={() => setActiveCategory(cat.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.filterEmoji}>{cat.emoji}</Text>
            <Text style={[styles.filterLabel, activeCategory === cat.id && styles.filterLabelActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {loading && filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color={Colors.textPlaceholder} />
            <Text style={styles.emptyText}>Finding requests…</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌿</Text>
            <Text style={styles.emptyTitle}>No requests here yet</Text>
            <Text style={styles.emptyBody}>Be the first helper in this area</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>{filtered.length} request{filtered.length !== 1 ? 's' : ''} nearby</Text>
            {filtered.map(post => <RequestCard key={post.id} post={post} />)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontFamily: Font.serif,
    fontSize: FontSize.heading,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: 10,
    backgroundColor: Colors.surfaceSoft,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: Font.sans,
    fontSize: FontSize.bodyS,
    color: Colors.textPrimary,
    padding: 0,
    margin: 0,
  },
  filterScroll: {
    maxHeight: 44,
    marginBottom: 6,
  },
  filterContent: {
    paddingHorizontal: Spacing.md,
    gap: 6,
    alignItems: 'center',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSoft,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterPillActive: {
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
  },
  filterEmoji: {
    fontSize: 13,
  },
  filterLabel: {
    fontFamily: Font.sans,
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
  },
  filterLabelActive: {
    color: Colors.background,
    fontFamily: Font.sansBold,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 40,
    paddingTop: 8,
  },
  sectionLabel: {
    fontFamily: Font.sans,
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
    marginBottom: 10,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSoft,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: 8,
    gap: 10,
    ...Shadows.sm,
  },
  cardLeft: {
    flexShrink: 0,
  },
  cardEmojiBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardEmoji: {
    fontSize: 18,
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontFamily: Font.sansBold,
    fontSize: FontSize.bodyS,
    color: Colors.textPrimary,
    lineHeight: 19,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  cardMetaText: {
    fontFamily: Font.sans,
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.textPlaceholder,
  },
  rewardBadge: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  rewardText: {
    fontFamily: Font.sansBold,
    fontSize: FontSize.caption,
    color: '#16a34a',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: Font.sansBold,
    fontSize: FontSize.body,
    color: Colors.textPrimary,
  },
  emptyBody: {
    fontFamily: Font.sans,
    fontSize: FontSize.bodyS,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: Font.sans,
    fontSize: FontSize.bodyS,
    color: Colors.textSecondary,
    marginTop: 8,
  },
});
