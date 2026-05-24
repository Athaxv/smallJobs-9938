import { Tabs, router } from 'expo-router';
import { TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import { House, Compass, ChatCircle, User, Plus } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Font, Shadows } from '../../lib/theme';
import { useUnreadCount } from '../../lib/useUnreadCount';
import { PushNotificationSetup } from '../../components/PushNotificationSetup';

function PostFAB({ bottomInset }: { bottomInset: number }) {
  const lift = Platform.OS === 'ios' ? 16 : Math.max(16, bottomInset / 2 + 8);
  return (
    <View style={styles.fabWrapper}>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => router.push('/post')}
        style={[styles.fab, { marginBottom: lift }]}
      >
        <View style={styles.fabInner}>
          <Plus size={24} color="#FFFFFF" weight="bold" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const unreadCount = useUnreadCount();

  const tabBarHeight = 64 + insets.bottom;
  const tabBarPaddingBottom = insets.bottom + (Platform.OS === 'android' ? 4 : 0);

  return (
    <>
      <PushNotificationSetup />
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: tabBarHeight,
          backgroundColor: Colors.background,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          paddingTop: 8,
          paddingBottom: tabBarPaddingBottom,
          ...Shadows.xs,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textPlaceholder,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, focused }) => (
            <House size={22} color={color} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <Compass size={22} color={color} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
      <Tabs.Screen
        name="post-tab"
        options={{
          title: '',
          tabBarIcon: () => null,
          tabBarLabel: () => null,
          tabBarButton: () => <PostFAB bottomInset={insets.bottom} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ color, focused }) => (
            <ChatCircle size={22} color={color} weight={focused ? 'fill' : 'regular'} />
          ),
          // Only show badge when there are real unread messages
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: unreadCount > 0 ? styles.badge : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <User size={22} color={color} weight={focused ? 'fill' : 'regular'} />
          ),
        }}
      />
    </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  tabLabel: {
    fontSize: 10,
    fontFamily: Font.sansMedium,
    marginTop: 2,
  },
  tabItem: { paddingTop: 0 },
  fabWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  fab: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  badge: {
    backgroundColor: '#111111',
    fontSize: 9,
    fontWeight: '700',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
  },
});
