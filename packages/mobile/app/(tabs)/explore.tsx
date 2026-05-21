/**
 * Explore — Map-powered local activity view
 * Uses Leaflet via WebView (Expo Go compatible — no native modules needed)
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { MapPin, ArrowsClockwise, X, Lightning } from 'phosphor-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, Font, Radius, Shadows } from '../../lib/theme';
import { API_URL } from '../../lib/config';

const { height: SCREEN_H } = Dimensions.get('window');

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

const CATEGORIES: { id: string; label: string; emoji: string }[] = [
  { id: 'all', label: 'All', emoji: '🗺️' },
  { id: 'grocery', label: 'Grocery', emoji: '🛒' },
  { id: 'health', label: 'Medicine', emoji: '💊' },
  { id: 'delivery', label: 'Delivery', emoji: '📦' },
  { id: 'transport', label: 'Ride', emoji: '🚗' },
  { id: 'tech', label: 'Tech', emoji: '💻' },
  { id: 'repair', label: 'Repair', emoji: '🔧' },
  { id: 'teaching', label: 'Tutor', emoji: '📚' },
  { id: 'other', label: 'Other', emoji: '✨' },
];

function categoryEmoji(cat: string): string {
  return CATEGORIES.find(c => c.id === cat)?.emoji ?? '📌';
}

function formatTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Bottom Sheet snap points ─────────────────────────────────────────────────

const SHEET_COLLAPSED = SCREEN_H * 0.72;
const SHEET_HALF      = SCREEN_H * 0.45;
const SHEET_FULL      = 170;
const SNAP_POINTS     = [SHEET_COLLAPSED, SHEET_HALF, SHEET_FULL];

function snapTo(y: number): number {
  let best = SNAP_POINTS[0];
  let bestDist = Math.abs(y - SNAP_POINTS[0]);
  for (const p of SNAP_POINTS) {
    if (Math.abs(y - p) < bestDist) { best = p; bestDist = Math.abs(y - p); }
  }
  return best;
}

// ─── Leaflet HTML ─────────────────────────────────────────────────────────────

function buildMapHtml(lat: number, lng: number, posts: NearbyPost[], selectedId: string | null): string {
  const markers = posts.map(p => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    emoji: categoryEmoji(p.category),
    selected: p.id === selectedId,
    title: p.title,
  }));

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body,#map { width:100%; height:100%; background:#e8e8e8; }
  .marker-pin {
    width:38px; height:38px; border-radius:50%;
    background:#fff; border:2px solid #e0e0e0;
    display:flex; align-items:center; justify-content:center;
    font-size:18px; box-shadow:0 2px 8px rgba(0,0,0,0.15);
    cursor:pointer; transition:transform 0.15s;
  }
  .marker-pin.selected {
    border:2.5px solid #1a1a1a; background:#f5f5f5;
    transform:scale(1.2);
  }
  .leaflet-control-zoom { display:none; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl:false, attributionControl:false })
    .setView([${lat}, ${lng}], 14);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom:19
  }).addTo(map);

  var markers = ${JSON.stringify(markers)};
  markers.forEach(function(m) {
    var icon = L.divIcon({
      html: '<div class="marker-pin' + (m.selected ? ' selected' : '') + '">' + m.emoji + '</div>',
      iconSize:[38,38], iconAnchor:[19,19], className:''
    });
    L.marker([m.lat, m.lng], {icon:icon})
      .addTo(map)
      .on('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'markerPress',id:m.id}));
      });
  });

  // User location dot
  if (${lat !== DEFAULT_LAT}) {
    L.circleMarker([${lat}, ${lng}], {
      radius:8, fillColor:'#1a1a1a', fillOpacity:1, color:'#fff', weight:2
    }).addTo(map);
  }

  // Listen for recenter commands
  document.addEventListener('message', function(e) {
    try {
      var msg = JSON.parse(e.data);
      if (msg.type === 'recenter') map.setView([msg.lat, msg.lng], 14);
      if (msg.type === 'focusPost') map.setView([msg.lat, msg.lng], 16);
    } catch(ex) {}
  });
  window.addEventListener('message', function(e) {
    try {
      var msg = JSON.parse(e.data);
      if (msg.type === 'recenter') map.setView([msg.lat, msg.lng], 14);
      if (msg.type === 'focusPost') map.setView([msg.lat, msg.lng], 16);
    } catch(ex) {}
  });
</script>
</body>
</html>`;
}

// ─── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({
  post, selected, onPress,
}: { post: NearbyPost; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.requestCard, selected && styles.requestCardSelected]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.requestCardLeft}>
        <View style={[styles.requestEmojiBg, selected && styles.requestEmojiBgSelected]}>
          <Text style={styles.requestEmoji}>{categoryEmoji(post.category)}</Text>
        </View>
      </View>
      <View style={styles.requestCardBody}>
        <Text style={styles.requestTitle} numberOfLines={2}>{post.title}</Text>
        <View style={styles.requestMeta}>
          <Text style={styles.requestMetaText}>{post.distanceKm} km away</Text>
          <View style={styles.metaDot} />
          <Text style={styles.requestMetaText}>{formatTime(post.createdAt)}</Text>
          {post.responseCount > 0 && (
            <>
              <View style={styles.metaDot} />
              <Text style={styles.requestMetaText}>{post.responseCount} response{post.responseCount !== 1 ? 's' : ''}</Text>
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

// ─── Selected Preview ─────────────────────────────────────────────────────────

function SelectedPreview({ post, onClose }: { post: NearbyPost; onClose: () => void }) {
  return (
    <View style={styles.previewCard}>
      <View style={styles.previewHeader}>
        <View style={styles.previewEmojiWrap}>
          <Text style={{ fontSize: 22 }}>{categoryEmoji(post.category)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.previewTitle} numberOfLines={2}>{post.title}</Text>
          <View style={styles.previewMeta}>
            <MapPin size={11} color="rgba(255,255,255,0.5)" />
            <Text style={styles.previewMetaText}>{post.distanceKm} km · {post.category}</Text>
            <View style={styles.metaDot} />
            <Text style={styles.previewMetaText}>{formatTime(post.createdAt)}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.previewClose}>
          <X size={14} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>
      <View style={styles.previewActions}>
        <TouchableOpacity
          style={styles.helpBtn}
          onPress={() => router.push(`/thread/${post.id}` as any)}
        >
          <Lightning size={14} color="#0A0A0A" weight="fill" />
          <Text style={styles.helpBtnText}>I Can Help</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.viewBtn}
          onPress={() => router.push(`/thread/${post.id}` as any)}
        >
          <Text style={styles.viewBtnText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const sheetY = useRef(new Animated.Value(SHEET_COLLAPSED)).current;
  const sheetYVal = useRef(SHEET_COLLAPSED);

  const [posts, setPosts] = useState<NearbyPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLat, setUserLat] = useState(DEFAULT_LAT);
  const [userLng, setUserLng] = useState(DEFAULT_LNG);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedPost, setSelectedPost] = useState<NearbyPost | null>(null);
  const [mapHtml, setMapHtml] = useState('');

  // ── Location ──

  const requestLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLat(loc.coords.latitude);
      setUserLng(loc.coords.longitude);
      webViewRef.current?.injectJavaScript(
        `map.setView([${loc.coords.latitude},${loc.coords.longitude}],14);true;`
      );
    } catch {}
  }, []);

  useEffect(() => { requestLocation(); }, [requestLocation]);

  // ── Fetch nearby ──

  const fetchNearby = useCallback(async (lat: number, lng: number, cat: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        lat: String(lat), lng: String(lng), radius: '10', limit: '50',
      });
      if (cat !== 'all') params.set('category', cat);
      const res = await fetch(`${API_URL}/api/posts/nearby?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setPosts(data.posts);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNearby(userLat, userLng, activeCategory); }, [activeCategory, fetchNearby]);

  // Rebuild map HTML when posts or selection changes
  useEffect(() => {
    setMapHtml(buildMapHtml(userLat, userLng, posts, selectedPost?.id ?? null));
  }, [posts, selectedPost, userLat, userLng]);

  // ── Bottom sheet pan ──

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderMove: (_, gs) => {
        const newY = Math.max(SHEET_FULL, Math.min(SHEET_COLLAPSED, sheetYVal.current + gs.dy));
        sheetY.setValue(newY);
      },
      onPanResponderRelease: (_, gs) => {
        const projected = sheetYVal.current + gs.dy + gs.vy * 80;
        const snapped = snapTo(projected);
        sheetYVal.current = snapped;
        Animated.spring(sheetY, { toValue: snapped, useNativeDriver: false, tension: 80, friction: 12 }).start();
      },
    })
  ).current;

  sheetY.addListener(({ value }) => { sheetYVal.current = value; });

  const expandSheet = () => {
    sheetYVal.current = SHEET_HALF;
    Animated.spring(sheetY, { toValue: SHEET_HALF, useNativeDriver: false, tension: 80, friction: 12 }).start();
  };

  // ── WebView message handler ──

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'markerPress') {
        const post = posts.find(p => p.id === msg.id);
        if (post) {
          setSelectedPost(post);
          expandSheet();
          webViewRef.current?.injectJavaScript(
            `map.setView([${post.lat - 0.008},${post.lng}],16);true;`
          );
        }
      }
    } catch {}
  }, [posts]);

  // ── Category change ──

  const handleCategoryChange = (id: string) => {
    setActiveCategory(id);
    setSelectedPost(null);
    fetchNearby(userLat, userLng, id);
  };

  // ── Recenter ──

  const recenter = () => {
    webViewRef.current?.injectJavaScript(`map.setView([${userLat},${userLng}],14);true;`);
  };

  const activeCount = posts.length;

  return (
    <View style={styles.root}>
      {/* ── Leaflet Map ── */}
      {mapHtml ? (
        <WebView
          ref={webViewRef}
          style={StyleSheet.absoluteFill}
          source={{ html: mapHtml }}
          onMessage={handleWebViewMessage}
          scrollEnabled={false}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState={false}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.mapPlaceholder]}>
          <ActivityIndicator color={Colors.textPlaceholder} />
        </View>
      )}

      {/* ── Top UI ── */}
      <SafeAreaView edges={['top']} style={styles.topSafe}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MapPin size={18} color={Colors.textPrimary} weight="fill" />
            <Text style={styles.headerTitle}>Explore</Text>
          </View>
          <View style={styles.headerRight}>
            {loading && <ActivityIndicator size="small" color={Colors.textPrimary} style={{ marginRight: 8 }} />}
            <TouchableOpacity style={styles.iconBtn} onPress={recenter}>
              <ArrowsClockwise size={16} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
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
              onPress={() => handleCategoryChange(cat.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.filterEmoji}>{cat.emoji}</Text>
              <Text style={[styles.filterLabel, activeCategory === cat.id && styles.filterLabelActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Activity banner */}
        {activeCount > 0 && (
          <View style={styles.activityBanner}>
            <View style={styles.activityDot} />
            <Text style={styles.activityText}>
              {activeCount} active request{activeCount !== 1 ? 's' : ''} nearby
            </Text>
          </View>
        )}
      </SafeAreaView>

      {/* ── Bottom Sheet ── */}
      <Animated.View style={[styles.sheet, { top: sheetY }]}>
        {/* Handle */}
        <View style={styles.sheetHandleArea} {...panResponder.panHandlers}>
          <View style={styles.sheetHandle} />
        </View>

        {/* Selected preview */}
        {selectedPost && (
          <SelectedPreview post={selectedPost} onClose={() => setSelectedPost(null)} />
        )}

        {/* Sheet header */}
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>
            {selectedPost ? 'Nearby Requests' : activeCount > 0 ? `${activeCount} requests near you` : 'Requests near you'}
          </Text>
          {activeCategory !== 'all' && (
            <TouchableOpacity
              style={styles.clearFilterBtn}
              onPress={() => handleCategoryChange('all')}
            >
              <Text style={styles.clearFilterText}>
                {CATEGORIES.find(c => c.id === activeCategory)?.emoji} {CATEGORIES.find(c => c.id === activeCategory)?.label}
              </Text>
              <X size={11} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          style={styles.sheetScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetScrollContent}
        >
          {loading && posts.length === 0 ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={Colors.textPlaceholder} />
              <Text style={styles.emptyText}>Finding requests near you…</Text>
            </View>
          ) : posts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🌿</Text>
              <Text style={styles.emptyTitle}>No active requests nearby</Text>
              <Text style={styles.emptyBody}>Be the first helper in this area</Text>
              <TouchableOpacity
                style={styles.emptyAction}
                onPress={() => router.push('/' as any)}
              >
                <Text style={styles.emptyActionText}>Browse all requests</Text>
              </TouchableOpacity>
            </View>
          ) : (
            posts.map(post => (
              <RequestCard
                key={post.id}
                post={post}
                selected={selectedPost?.id === post.id}
                onPress={() => {
                  setSelectedPost(post);
                  expandSheet();
                  webViewRef.current?.injectJavaScript(
                    `map.setView([${post.lat - 0.008},${post.lng}],16);true;`
                  );
                }}
              />
            ))
          )}
          <View style={{ height: 120 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E8E8E8' },
  mapPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8E8E8' },

  topSafe: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: Spacing.screenH, marginTop: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.base, paddingVertical: 11,
    ...Shadows.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: FontSize.displayL, fontFamily: Font.serif, color: Colors.textPrimary, letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.surfaceSoft, alignItems: 'center', justifyContent: 'center',
  },

  filterScroll: { marginTop: Spacing.sm },
  filterContent: { paddingHorizontal: Spacing.screenH, gap: Spacing.sm, paddingVertical: 2 },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.background, borderRadius: Radius.pill,
    paddingHorizontal: 13, paddingVertical: 7,
    borderWidth: 1.5, borderColor: 'transparent',
    ...Shadows.xs,
  },
  filterPillActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterEmoji: { fontSize: 13 },
  filterLabel: { fontSize: FontSize.caption, fontFamily: Font.sansMedium, color: Colors.textSecondary },
  filterLabelActive: { color: '#fff' },

  activityBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    alignSelf: 'flex-start', marginLeft: Spacing.screenH, marginTop: Spacing.sm,
    backgroundColor: Colors.background, borderRadius: Radius.pill,
    paddingHorizontal: 12, paddingVertical: 6,
    ...Shadows.xs,
  },
  activityDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.success },
  activityText: { fontSize: FontSize.caption, fontFamily: Font.sansMedium, color: Colors.textPrimary },

  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
    ...Shadows.lg, overflow: 'hidden',
  },
  sheetHandleArea: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.borderStrong },

  previewCard: {
    marginHorizontal: Spacing.screenH, marginBottom: Spacing.sm,
    backgroundColor: '#0A0A0A', borderRadius: Radius.xl, padding: Spacing.base,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.md },
  previewEmojiWrap: {
    width: 42, height: 42, borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  previewTitle: { fontSize: FontSize.body, fontFamily: Font.sansSemibold, color: '#fff', lineHeight: 20, marginBottom: 4 },
  previewMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  previewMetaText: { fontSize: FontSize.caption, fontFamily: Font.sans, color: 'rgba(255,255,255,0.5)' },
  previewClose: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  previewActions: { flexDirection: 'row', gap: Spacing.sm },
  helpBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: Radius.lg, paddingVertical: 11,
  },
  helpBtnText: { fontSize: FontSize.bodyS, fontFamily: Font.sansSemibold, color: '#0A0A0A' },
  viewBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: Radius.lg, paddingVertical: 11,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  viewBtnText: { fontSize: FontSize.bodyS, fontFamily: Font.sansMedium, color: 'rgba(255,255,255,0.7)' },

  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH, paddingBottom: Spacing.sm,
  },
  sheetTitle: { fontSize: FontSize.subheading, fontFamily: Font.serif, color: Colors.textPrimary, letterSpacing: -0.3 },
  clearFilterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surfaceSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill,
  },
  clearFilterText: { fontSize: FontSize.caption, fontFamily: Font.sansMedium, color: Colors.textSecondary },
  sheetScroll: { flex: 1 },
  sheetScrollContent: { paddingHorizontal: Spacing.screenH, paddingTop: 4 },

  requestCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  requestCardSelected: {
    backgroundColor: Colors.surfaceSoft,
    marginHorizontal: -Spacing.screenH, paddingHorizontal: Spacing.screenH,
    borderRadius: Radius.md, borderBottomWidth: 0,
  },
  requestCardLeft: { flexShrink: 0 },
  requestEmojiBg: {
    width: 42, height: 42, borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSoft, alignItems: 'center', justifyContent: 'center',
  },
  requestEmojiBgSelected: { backgroundColor: Colors.black08 },
  requestEmoji: { fontSize: 20 },
  requestCardBody: { flex: 1 },
  requestTitle: { fontSize: FontSize.bodyS, fontFamily: Font.sansMedium, color: Colors.textPrimary, lineHeight: 18 },
  requestMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3, flexWrap: 'wrap' },
  requestMetaText: { fontSize: FontSize.caption, fontFamily: Font.sans, color: Colors.textSecondary },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.textPlaceholder },
  rewardBadge: {
    backgroundColor: Colors.successSurface, borderRadius: Radius.pill,
    paddingHorizontal: 9, paddingVertical: 4, flexShrink: 0,
  },
  rewardText: { fontSize: FontSize.caption, fontFamily: Font.sansSemibold, color: Colors.success },

  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxxl, gap: Spacing.sm },
  emptyEmoji: { fontSize: 36 },
  emptyTitle: { fontSize: FontSize.subheading, fontFamily: Font.sansSemibold, color: Colors.textPrimary },
  emptyBody: { fontSize: FontSize.body, fontFamily: Font.sans, color: Colors.textSecondary },
  emptyText: { fontSize: FontSize.body, fontFamily: Font.sans, color: Colors.textPlaceholder, marginTop: 8 },
  emptyAction: {
    marginTop: Spacing.sm, paddingHorizontal: Spacing.base, paddingVertical: 10,
    borderRadius: Radius.pill, borderWidth: 1.5, borderColor: Colors.borderStrong,
  },
  emptyActionText: { fontSize: FontSize.bodyS, fontFamily: Font.sansMedium, color: Colors.textPrimary },
});
