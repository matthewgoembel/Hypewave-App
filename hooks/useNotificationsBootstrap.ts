// hooks/useNotificationsBootstrap.ts
import type { NotificationHandler } from "expo-notifications";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

/** Typed handler including all required keys (iOS 17 SDK adds banner/list flags) */
const handler: NotificationHandler = {
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    // iOS-specific (required by newer types)
    shouldShowBanner: true,
    shouldShowList: true,
  }),
};

let _handlerSet = false;
function ensureNotificationHandlerSet() {
  if (!_handlerSet) {
    Notifications.setNotificationHandler(handler);
    _handlerSet = true;
  }
}

export function useSetupNotificationChannels() {
  ensureNotificationHandlerSet();

  useEffect(() => {
    (async () => {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.DEFAULT,
        });
        await Notifications.setNotificationChannelAsync("signals", {
          name: "Signals",
          importance: Notifications.AndroidImportance.HIGH,
        });
        await Notifications.setNotificationChannelAsync("news", {
          name: "News",
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
    })();
  }, []);
}

/** When user taps a notification, route into the app */
export function useNotificationRouting() {
  ensureNotificationHandlerSet();

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp.notification.request.content.data as any;
      const route = data?.route || (data?.type === "signal" ? "/signals" : "/news");
      if (route) router.push(route);
    });
    return () => sub.remove();
  }, []);
}
