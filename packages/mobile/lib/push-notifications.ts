import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { notificationsApi } from "./api";

type PermissionResult = Awaited<
  ReturnType<typeof Notifications.getPermissionsAsync>
>;

function isNotificationPermissionGranted(perm: PermissionResult): boolean {
  const legacy = perm as PermissionResult & { granted?: boolean; status?: string };
  return legacy.granted === true || legacy.status === "granted";
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let cachedToken: string | null = null;

export function getCachedPushToken(): string | null {
  return cachedToken;
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const existing = await Notifications.getPermissionsAsync();
  if (!isNotificationPermissionGranted(existing)) {
    const requested = await Notifications.requestPermissionsAsync();
    if (!isNotificationPermissionGranted(requested)) return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn("[push] Missing EAS projectId");
    return null;
  }

  try {
    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResult.data;
    cachedToken = token;

    const platform = Platform.OS === "ios" ? "ios" : "android";
    await notificationsApi.registerPushToken(token, platform);
    return token;
  } catch (err) {
    console.warn("[push] Token registration failed", err);
    return null;
  }
}

export async function unregisterPushToken(): Promise<void> {
  const token = cachedToken;
  if (!token) return;
  try {
    await notificationsApi.deletePushToken(token);
  } catch {
    // ignore — logout should still proceed
  } finally {
    cachedToken = null;
  }
}
