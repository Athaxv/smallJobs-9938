import { useEffect } from "react";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { registerForPushNotifications } from "../lib/push-notifications";

export function PushNotificationSetup() {
  useEffect(() => {
    void registerForPushNotifications();

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      const postId = typeof data?.postId === "string" ? data.postId : null;
      if (postId) {
        router.push(`/thread/${postId}`);
      }
    });

    return () => sub.remove();
  }, []);

  return null;
}
