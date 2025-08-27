// utils/pushNotifications.ts
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Alert, Platform } from "react-native";

const KEY_NOTIF_ENABLED = "prefs_notifications";
const KEY_PUSH_TOKEN = "push_token";

export async function getSavedNotificationPref(): Promise<boolean> {
  const saved = await SecureStore.getItemAsync(KEY_NOTIF_ENABLED);
  return saved === null ? true : saved === "true";
}

export async function setSavedNotificationPref(v: boolean) {
  await SecureStore.setItemAsync(KEY_NOTIF_ENABLED, v ? "true" : "false");
}

export async function getSavedPushToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(KEY_PUSH_TOKEN);
}

export async function setSavedPushToken(token: string | null) {
  if (token) await SecureStore.setItemAsync(KEY_PUSH_TOKEN, token);
  else await SecureStore.deleteItemAsync(KEY_PUSH_TOKEN);
}

/** Ask permission, create Android channels, and save Expo push token (local only). */
export async function enableNotificationsFlow(): Promise<{ granted: boolean; token?: string }> {
  if (!Device.isDevice) {
    Alert.alert("Notifications", "Use a physical device to test push notifications.");
    return { granted: false };
  }

  // Check/request permission
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  const granted = status === "granted";
  if (!granted) return { granted: false };

  // Android channel (safety net)
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

  // Save Expo push token locally (hook to your backend later)
  
  const projectId =
    (Constants.expoConfig?.extra as any)?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId;

  if (!projectId) throw new Error("No projectId found in app.json extra.eas.projectId");

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });

  const token = tokenData.data;
  await setSavedPushToken(token);

  return { granted: true, token };
}

export async function disableNotificationsFlow() {
  // Local-only: clear token; later, also unregister server-side.
  await setSavedPushToken(null);
}
