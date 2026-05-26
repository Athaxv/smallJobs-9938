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
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { MapPin, ArrowsClockwise, X, Lightning, NavigationArrow, ChatCircle, CaretDown, CaretUp } from 'phosphor-react-native';
import { categoryEmoji, EXPLORE_FILTER_CATEGORIES } from '@template/web/categories';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Colors, Spacing, FontSize, Font, Radius, Shadows } from '../../lib/theme';
import { API_URL } from '../../lib/config';
import { syncProfileCoordinates } from '../../lib/sync-profile-location';
import { displayPostTitle } from '../../lib/postDisplay';
import { buildMapHtml, DEFAULT_LAT, DEFAULT_LNG } from '../../lib/map-html';
import { isPostFeedVisible } from '../../lib/postVisibility';
import {
  fetchDrivingRoute,
  formatRouteDistance,
  formatRouteDuration,
  type RouteResult,
} from '../../lib/fetch-route';
import { profileApi, type ActiveHelpSummary } from '../../lib/api';
import { buildExploreRouteParams, isNavigablePost } from '../../lib/explore-route';
import { openExternalMapsDirections } from '../../lib/active-help';
import { ARRIVAL_RADIUS_M, haversineDistanceM, REROUTE_DISTANCE_M } from '../../lib/geo';
import { getTokenAsync } from '../../lib/auth';

const { height: SCREEN_H } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

interface NearbyPost {
  id: string;
  title: string;
  category: string;
  isPaid: boolean;
  amount: number | null;
  status: string;
  urgency?: string;
  expiresAt?: number | null;
  responseCount: number;
  createdAt: number;
  lat: number;
  lng: number;
  distanceKm: number;
  author: { userId: string; name: string; avatar: string | null; location: string | null; rating: number };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = EXPLORE_FILTER_CATEGORIES;

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
const ROUTE_SHEET_PEEK = SCREEN_H * 0.58;
const SNAP_POINTS     = [SHEET_COLLAPSED, SHEET_HALF, SHEET_FULL, ROUTE_SHEET_PEEK];

function snapTo(y: number): number {
  let best = SNAP_POINTS[0];
  let bestDist = Math.abs(y - SNAP_POINTS[0]);
  for (const p of SNAP_POINTS) {
    if (Math.abs(y - p) < bestDist) { best = p; bestDist = Math.abs(y - p); }
  }
  return best;
}

// ─── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({
  post, selected, onPress,
}: { post: NearbyPost; selected: boolean; onPress: () => void }) {
  const headline = displayPostTitle(post.title, undefined, post.category);
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
        <Text style={styles.requestTitle} numberOfLines={2}>{headline}</Text>
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
  const headline = displayPostTitle(post.title, undefined, post.category);
  return (
    <View style={styles.previewCard}>
      <View style={styles.previewHeader}>
        <View style={styles.previewEmojiWrap}>
          <Text style={{ fontSize: 22 }}>{categoryEmoji(post.category)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.previewTitle} numberOfLines={2}>{headline}</Text>
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

// ─── Route Banner ─────────────────────────────────────────────────────────────

function RouteBanner({
  title,
  distanceM,
  durationSec,
  conversationId,
  onClear,
  canDismiss,
  hasArrived,
  destLat,
  destLng,
}: {
  title: string;
  distanceM: number | null;
  durationSec: number | null;
  conversationId?: string;
  onClear: () => void;
  canDismiss: boolean;
  hasArrived: boolean;
  destLat: number | null;
  destLng: number | null;
}) {
  return (
    <View style={styles.routeBanner}>
      <View style={styles.routeBannerTop}>
        <NavigationArrow size={16} color="#fff" weight="fill" />
        <Text style={styles.routeBannerTitle} numberOfLines={1}>
          {hasArrived ? `Arrived · ${title}` : title}
        </Text>
        {canDismiss ? (
          <TouchableOpacity onPress={onClear} style={styles.routeCloseBtn}>
            <X size={14} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        ) : (
          <View style={styles.routeCloseBtn} />
        )}
      </View>
      <View style={styles.routeBannerMeta}>
        <Text style={styles.routeMetaText}>
          {hasArrived
            ? 'You can dismiss this route'
            : `${distanceM != null ? formatRouteDistance(distanceM) : '—'}${durationSec != null ? ` · ${formatRouteDuration(durationSec)}` : ''}`}
        </Text>
      </View>
      <View style={styles.routeBannerActions}>
        {destLat != null && destLng != null ? (
          <TouchableOpacity
            style={styles.routeMessageBtn}
            onPress={() => openExternalMapsDirections(destLat, destLng, title)}
          >
            <NavigationArrow size={14} color="#0A0A0A" weight="fill" />
            <Text style={styles.routeMessageText}>Open in Maps</Text>
          </TouchableOpacity>
        ) : null}
        {conversationId ? (
          <TouchableOpacity
            style={styles.routeMessageBtn}
            onPress={() => router.push(`/chat/${conversationId}` as any)}
          >
            <ChatCircle size={14} color="#0A0A0A" weight="fill" />
            <Text style={styles.routeMessageText}>Message</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

// ─── Heading To (route mode sheet) ────────────────────────────────────────────

function HeadingToSheet({
  title,
  category,
  distanceM,
  durationSec,
  routeLoading,
  conversationId,
  routePostId,
  hasArrived,
  destLat,
  destLng,
  onMarkArrived,
  markingArrived,
}: {
  title: string;
  category: string;
  distanceM: number | null;
  durationSec: number | null;
  routeLoading: boolean;
  conversationId?: string;
  routePostId: string;
  hasArrived: boolean;
  destLat: number | null;
  destLng: number | null;
  onMarkArrived: () => void;
  markingArrived: boolean;
}) {
  const meta = hasArrived
    ? 'You have arrived at the destination'
    : routeLoading
      ? 'Calculating route…'
      : `${distanceM != null ? formatRouteDistance(distanceM) : '—'}${durationSec != null ? ` · ${formatRouteDuration(durationSec)}` : ''}`;

  return (
    <View style={styles.headingToSection}>
      <Text style={styles.headingToLabel}>{hasArrived ? 'Arrived at' : 'Heading to'}</Text>
      <View style={styles.headingToCard}>
        <View style={styles.headingToHeader}>
          <View style={styles.headingToEmojiWrap}>
            <Text style={styles.headingToEmoji}>{categoryEmoji(category)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headingToTitle} numberOfLines={2}>{title}</Text>
            <Text style={styles.headingToMeta}>{meta}</Text>
          </View>
        </View>
        <View style={styles.headingToActions}>
          {destLat != null && destLng != null ? (
            <TouchableOpacity
              style={styles.headingToBtnPrimary}
              onPress={() => openExternalMapsDirections(destLat, destLng, title)}
            >
              <NavigationArrow size={14} color="#0A0A0A" weight="fill" />
              <Text style={styles.headingToBtnPrimaryText}>Open in Maps</Text>
            </TouchableOpacity>
          ) : null}
          {conversationId ? (
            <TouchableOpacity
              style={styles.headingToBtnPrimary}
              onPress={() => router.push(`/chat/${conversationId}` as any)}
            >
              <ChatCircle size={14} color="#0A0A0A" weight="fill" />
              <Text style={styles.headingToBtnPrimaryText}>Message</Text>
            </TouchableOpacity>
          ) : null}
          {!hasArrived ? (
            <TouchableOpacity
              style={styles.headingToBtnSecondary}
              onPress={onMarkArrived}
              disabled={markingArrived}
            >
              {markingArrived
                ? <ActivityIndicator size="small" color={Colors.textPrimary} />
                : <Text style={styles.headingToBtnSecondaryText}>I've arrived</Text>}
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.headingToBtnSecondary}
            onPress={() => router.push(`/thread/${routePostId}` as any)}
          >
            <Text style={styles.headingToBtnSecondaryText}>View thread</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ExploreScreen() {
  const params = useLocalSearchParams<{
    routePostId?: string;
    destLat?: string;
    destLng?: string;
    destTitle?: string;
    destCategory?: string;
    conversationId?: string;
  }>();

  const routePostId = params.routePostId?.trim() || '';
  const destLat = params.destLat ? Number(params.destLat) : null;
  const destLng = params.destLng ? Number(params.destLng) : null;
  const destTitle = params.destTitle?.trim() || 'Destination';
  const destCategory = params.destCategory?.trim() || 'other';
  const conversationId = params.conversationId?.trim() || '';
  const isRouteMode = Boolean(routePostId && destLat != null && destLng != null && !Number.isNaN(destLat) && !Number.isNaN(destLng));

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
  const [routeData, setRouteData] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [otherNearbyExpanded, setOtherNearbyExpanded] = useState(false);
  const [activeHelp, setActiveHelp] = useState<ActiveHelpSummary | null>(null);
  const [hasArrived, setHasArrived] = useState(false);
  const [markingArrived, setMarkingArrived] = useState(false);
  const [routePostStatus, setRoutePostStatus] = useState<string>('open');
  const lastRouteFromRef = useRef<{ lat: number; lng: number } | null>(null);
  const routeDataRef = useRef<RouteResult | null>(null);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);

  // ── Location ──

  const requestLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLat(loc.coords.latitude);
      setUserLng(loc.coords.longitude);
      void syncProfileCoordinates(loc.coords.latitude, loc.coords.longitude);
      webViewRef.current?.injectJavaScript(
        `map.setView([${loc.coords.latitude},${loc.coords.longitude}],14);true;`
      );
    } catch {}
  }, []);

  useEffect(() => { requestLocation(); }, [requestLocation]);

  const updateUserOnMap = useCallback((lat: number, lng: number) => {
    webViewRef.current?.injectJavaScript(
      `window.ReactNativeWebView && document.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ type: 'updateUser', lat: ${lat}, lng: ${lng} }) }));true;`,
    );
  }, []);

  const refreshActiveHelp = useCallback(async () => {
    try {
      const data = await profileApi.getActiveHelp();
      setActiveHelp(data.activeHelp);
      if (data.activeHelp && isRouteMode && routePostId === data.activeHelp.post.id) {
        setRoutePostStatus(data.activeHelp.post.status);
      }
      return data.activeHelp;
    } catch {
      return null;
    }
  }, [isRouteMode, routePostId]);

  const clearRouteMode = useCallback(() => {
    setRouteData(null);
    routeDataRef.current = null;
    setHasArrived(false);
    setActiveHelp(null);
    lastRouteFromRef.current = null;
    router.replace('/(tabs)/explore' as any);
  }, []);

  const markArrived = useCallback(async () => {
    if (markingArrived) return;
    let help = activeHelp;
    if (!help) {
      help = await refreshActiveHelp();
    }
    if (!help) {
      Alert.alert('Error', 'No active help session found.');
      return;
    }
    setMarkingArrived(true);
    try {
      await profileApi.markArrived(help.responseId);
      setHasArrived(true);
      setActiveHelp(null);
    } catch {
      Alert.alert('Error', 'Could not mark arrival. Try again.');
    } finally {
      setMarkingArrived(false);
    }
  }, [activeHelp, markingArrived, refreshActiveHelp]);

  useFocusEffect(
    useCallback(() => {
      void refreshActiveHelp().then((help) => {
        if (!help || !isNavigablePost(help.post) || help.post.status !== 'open') return;
        if (isRouteMode && routePostId === help.post.id) return;
        router.setParams(buildExploreRouteParams(help.post, help.conversationId) as any);
      });
    }, [refreshActiveHelp, isRouteMode, routePostId]),
  );

  useEffect(() => {
    if (isRouteMode) void refreshActiveHelp();
  }, [isRouteMode, routePostId, refreshActiveHelp]);

  useEffect(() => {
    setHasArrived(false);
  }, [routePostId]);

  useEffect(() => {
    if (!isRouteMode) {
      locationWatchRef.current?.remove();
      locationWatchRef.current = null;
      lastRouteFromRef.current = null;
      return;
    }

    let cancelled = false;
    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      locationWatchRef.current?.remove();
      locationWatchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 15,
          timeInterval: 4000,
        },
        (loc) => {
          const lat = loc.coords.latitude;
          const lng = loc.coords.longitude;
          setUserLat(lat);
          setUserLng(lng);
          void syncProfileCoordinates(lat, lng);
          updateUserOnMap(lat, lng);
        },
      );
    })();

    return () => {
      cancelled = true;
      locationWatchRef.current?.remove();
      locationWatchRef.current = null;
    };
  }, [isRouteMode, updateUserOnMap]);

  useEffect(() => {
    if (!isRouteMode || !routePostId) return;

    const poll = async () => {
      try {
        const token = await getTokenAsync();
        const res = await fetch(`${API_URL}/api/posts/${routePostId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (data.ok) {
          setRoutePostStatus(data.post.status);
          if (data.post.status !== 'open') {
            Alert.alert(
              'Task ended',
              data.post.status === 'expired'
                ? 'This request has expired.'
                : 'This request has been closed.',
            );
            clearRouteMode();
          }
        }
      } catch {}
    };

    void poll();
    const id = setInterval(poll, 30000);
    return () => clearInterval(id);
  }, [isRouteMode, routePostId, clearRouteMode]);

  useEffect(() => {
    if (!isRouteMode || destLat == null || destLng == null || hasArrived || markingArrived) return;
    if (userLat === DEFAULT_LAT && userLng === DEFAULT_LNG) return;
    const dist = haversineDistanceM(userLat, userLng, destLat, destLng);
    if (dist <= ARRIVAL_RADIUS_M) {
      void markArrived();
    }
  }, [userLat, userLng, destLat, destLng, isRouteMode, hasArrived, markingArrived, markArrived]);

  useEffect(() => {
    if (userLat !== DEFAULT_LAT || userLng !== DEFAULT_LNG) {
      void syncProfileCoordinates(userLat, userLng);
    }
  }, [userLat, userLng]);

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
      if (data.ok) setPosts(data.posts.filter(isPostFeedVisible));
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchNearby(userLat, userLng, activeCategory);
  }, [userLat, userLng, activeCategory, fetchNearby]);

  useEffect(() => {
    if (isRouteMode) {
      sheetYVal.current = ROUTE_SHEET_PEEK;
      Animated.spring(sheetY, { toValue: ROUTE_SHEET_PEEK, useNativeDriver: false, tension: 80, friction: 12 }).start();
    }
  }, [isRouteMode, sheetY]);

  useEffect(() => {
    if (!isRouteMode || destLat == null || destLng == null) {
      setRouteData(null);
      lastRouteFromRef.current = null;
      return;
    }
    if (userLat === DEFAULT_LAT && userLng === DEFAULT_LNG) return;

    const last = lastRouteFromRef.current;
    if (last && routeDataRef.current) {
      const moved = haversineDistanceM(last.lat, last.lng, userLat, userLng);
      if (moved < REROUTE_DISTANCE_M) return;
    }

    lastRouteFromRef.current = { lat: userLat, lng: userLng };

    let cancelled = false;
    setRouteLoading(true);
    void fetchDrivingRoute(userLat, userLng, destLat, destLng).then((result) => {
      if (!cancelled) {
        routeDataRef.current = result;
        setRouteData(result);
        setRouteLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [isRouteMode, destLat, destLng, userLat, userLng]);

  useEffect(() => {
    if (isRouteMode && destLat != null && destLng != null) {
      setMapHtml(buildMapHtml({
        userLat,
        userLng,
        markers: [],
        routePolyline: routeData?.coordinates ?? [],
        routeDestination: {
          lat: destLat,
          lng: destLng,
          emoji: categoryEmoji(destCategory),
        },
      }));
      return;
    }

    setMapHtml(buildMapHtml({
      userLat,
      userLng,
      markers: posts.map(p => ({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        emoji: categoryEmoji(p.category),
      })),
      selectedId: selectedPost?.id ?? null,
    }));
  }, [posts, selectedPost, userLat, userLng, isRouteMode, destLat, destLng, destCategory, routeData]);

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
  const otherNearbyPosts = isRouteMode
    ? posts.filter(p => p.id !== routePostId)
    : posts;
  const isLockedRoute = Boolean(
    isRouteMode &&
    activeHelp &&
    activeHelp.post.id === routePostId &&
    !hasArrived &&
    routePostStatus === 'open',
  );
  const canDismissRoute = !isLockedRoute;

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
            {(loading || routeLoading) && (
              <ActivityIndicator size="small" color={Colors.textPrimary} style={{ marginRight: 8 }} />
            )}
            <TouchableOpacity style={styles.iconBtn} onPress={recenter}>
              <ArrowsClockwise size={16} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Category filters */}
        {!isRouteMode && (
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
        )}

        {/* Route banner */}
        {isRouteMode && (
          <RouteBanner
            title={destTitle}
            distanceM={routeData?.distanceM ?? null}
            durationSec={routeData?.durationSec ?? null}
            conversationId={conversationId || undefined}
            onClear={clearRouteMode}
            canDismiss={canDismissRoute}
            hasArrived={hasArrived}
            destLat={destLat}
            destLng={destLng}
          />
        )}

        {/* Activity banner */}
        {!isRouteMode && activeCount > 0 && (
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
        {!isRouteMode && selectedPost && (
          <SelectedPreview post={selectedPost} onClose={() => setSelectedPost(null)} />
        )}

        {isRouteMode ? (
          <>
            <HeadingToSheet
              title={destTitle}
              category={destCategory}
              distanceM={routeData?.distanceM ?? null}
              durationSec={routeData?.durationSec ?? null}
              routeLoading={routeLoading}
              conversationId={conversationId || undefined}
              routePostId={routePostId}
              hasArrived={hasArrived}
              destLat={destLat}
              destLng={destLng}
              onMarkArrived={markArrived}
              markingArrived={markingArrived}
            />
            <TouchableOpacity
              style={styles.otherNearbyToggle}
              onPress={() => setOtherNearbyExpanded(v => !v)}
              activeOpacity={0.8}
            >
              <Text style={styles.otherNearbyToggleText}>
                Other nearby ({otherNearbyPosts.length})
              </Text>
              {otherNearbyExpanded
                ? <CaretUp size={14} color={Colors.textSecondary} />
                : <CaretDown size={14} color={Colors.textSecondary} />}
            </TouchableOpacity>
            {otherNearbyExpanded && (
              <ScrollView
                style={styles.sheetScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sheetScrollContent}
              >
                {otherNearbyPosts.length === 0 ? (
                  <Text style={styles.otherNearbyEmpty}>No other active requests nearby</Text>
                ) : (
                  otherNearbyPosts.map(post => (
                    <RequestCard
                      key={post.id}
                      post={post}
                      selected={false}
                      onPress={() => router.push(`/thread/${post.id}` as any)}
                    />
                  ))
                )}
                <View style={{ height: 80 }} />
              </ScrollView>
            )}
          </>
        ) : (
          <>
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
                onPress={() => router.replace('/(tabs)' as any)}
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
          </>
        )}
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

  routeBanner: {
    marginHorizontal: Spacing.screenH,
    marginTop: Spacing.sm,
    backgroundColor: '#0A0A0A',
    borderRadius: Radius.xl,
    padding: Spacing.base,
    ...Shadows.sm,
  },
  routeBannerTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeBannerTitle: {
    flex: 1,
    fontSize: FontSize.body,
    fontFamily: Font.sansSemibold,
    color: '#fff',
  },
  routeCloseBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  routeBannerMeta: { marginTop: 6, marginBottom: Spacing.sm },
  routeBannerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  routeMetaText: { fontSize: FontSize.caption, fontFamily: Font.sans, color: 'rgba(255,255,255,0.65)' },
  routeMessageBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: Radius.lg, paddingVertical: 10, paddingHorizontal: 12,
  },
  routeMessageText: { fontSize: FontSize.bodyS, fontFamily: Font.sansSemibold, color: '#0A0A0A' },

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

  headingToSection: { paddingHorizontal: Spacing.screenH, paddingBottom: Spacing.sm },
  headingToLabel: {
    fontSize: FontSize.caption, fontFamily: Font.sansSemibold,
    color: Colors.textPlaceholder, textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  headingToCard: {
    backgroundColor: Colors.surfaceSoft, borderRadius: Radius.lg,
    padding: Spacing.base, gap: Spacing.md,
  },
  headingToHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  headingToEmojiWrap: {
    width: 44, height: 44, borderRadius: Radius.md,
    backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center',
  },
  headingToEmoji: { fontSize: 22 },
  headingToTitle: {
    fontSize: FontSize.body, fontFamily: Font.sansSemibold,
    color: Colors.textPrimary, lineHeight: 22,
  },
  headingToMeta: {
    fontSize: FontSize.caption, fontFamily: Font.sans,
    color: Colors.textSecondary, marginTop: 4,
  },
  headingToActions: { flexDirection: 'row', gap: Spacing.sm },
  headingToBtnPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 11,
  },
  headingToBtnPrimaryText: { fontSize: FontSize.bodyS, fontFamily: Font.sansSemibold, color: '#fff' },
  headingToBtnSecondary: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.background, borderRadius: Radius.lg, paddingVertical: 11,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  headingToBtnSecondaryText: { fontSize: FontSize.bodyS, fontFamily: Font.sansMedium, color: Colors.textPrimary },
  otherNearbyToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: Spacing.screenH, paddingVertical: Spacing.sm,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  otherNearbyToggleText: { fontSize: FontSize.bodyS, fontFamily: Font.sansMedium, color: Colors.textSecondary },
  otherNearbyEmpty: {
    fontSize: FontSize.bodyS, fontFamily: Font.sans, color: Colors.textPlaceholder,
    textAlign: 'center', paddingVertical: Spacing.lg,
  },
});
