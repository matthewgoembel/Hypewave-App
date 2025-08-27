import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useContext, useEffect, useState } from "react";

import { UserContext } from '@/components/UserContext';
import * as Linking from "expo-linking";

import {
  Alert,
  Dimensions,
  Image,
  Platform,
  Share,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

// 🔔 Notifications helpers
import {
  disableNotificationsFlow,
  enableNotificationsFlow,
  getSavedNotificationPref,
  setSavedNotificationPref,
} from "@/utils/pushNotifications";

const { width } = Dimensions.get("window");

export default function SideMenu({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { user } = useContext(UserContext);
  const isGuest = user?.guest;

  // Local UI state
  const [darkMode, setDarkMode] = useState(true); // (unused toggle right now)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const translateX = useSharedValue(width);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    translateX.value = withTiming(0, {
      duration: 200,
      easing: Easing.out(Easing.exp),
    });
    backdropOpacity.value = withTiming(1, {
      duration: 200,
      easing: Easing.out(Easing.exp),
    });

    // ✅ Hydrate notifications pref
    (async () => {
      try {
        const saved = await getSavedNotificationPref();
        setNotificationsEnabled(saved);
      } catch {
        setNotificationsEnabled(true);
      }
    })();
  }, []);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handleClose = () => {
    translateX.value = withTiming(width, { duration: 180 });
    backdropOpacity.value = withTiming(0, { duration: 180 });
    setTimeout(onClose, 200);
  };

  // Close drawer, then navigate
  const navigate = (path: string) => {
    handleClose();
    setTimeout(() => router.push(path), 220);
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('auth_token'); // matches UserContext
    handleClose();
    setTimeout(() => router.replace('/login'), 220);
  };

  // 🔔 Toggle notifications
  const onToggleNotifications = async (value: boolean) => {
    const prev = notificationsEnabled;
    setNotificationsEnabled(value); // optimistic

    try {
      if (value) {
        const { granted } = await enableNotificationsFlow();
        if (!granted) throw new Error("Permission not granted");
      } else {
        await disableNotificationsFlow();
      }
      await setSavedNotificationPref(value);
    } catch (e: any) {
      setNotificationsEnabled(prev);
      Alert.alert("Notifications", e?.message || "Could not update notifications.");
    }
  };

  // Open external URL after closing menu
  const openAfterClose = (url: string) => {
    handleClose();
    setTimeout(() => Linking.openURL(url), 220);
  };

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <TouchableOpacity activeOpacity={1} style={{ flex: 1 }} onPress={handleClose} />
      </Animated.View>

      <Animated.View style={[styles.panel, panelStyle]}>
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={
              user?.avatar_url
                ? { uri: user.avatar_url }
                : require("@/assets/icons/default-avatar.png")
            }
            style={styles.avatar}
          />

          <View style={styles.headerCenter}>
            <Text style={styles.name}>
              Hi, {user?.username || "Guest"} <Text style={{ opacity: 0.6 }}></Text>
            </Text>
            <Text style={styles.email}>{user?.email || "guest@hypewave.ai"}</Text>
          </View>

          {/* Account button on the right side of name/email */}
          {!isGuest && (
            <TouchableOpacity
              style={styles.accountBtnRight}
              onPress={() => navigate('/account')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.accountBtnText}>Account</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Preferences - only for logged-in users */}
        {!isGuest && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>

            {/* 🔔 Notifications toggle */}
            <View style={styles.prefRow}>
              <Text style={styles.prefLabel}>Notifications</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={onToggleNotifications}
                trackColor={{ false: "#666", true: "#3ABEFF" }}
                thumbColor={notificationsEnabled ? "#fff" : "#ccc"}
              />
            </View>

            <View style={styles.prefRow}>
              <Text style={styles.prefLabel}>Language</Text>
              <Text style={styles.prefValue}>English</Text>
            </View>

            <View style={styles.prefRow}>
              <Text style={styles.prefLabel}>Currency</Text>
              <Text style={styles.prefValue}>USD</Text>
            </View>
          </View>
        )}

        {/* Always show general settings/help */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Others</Text>

          <TouchableOpacity style={styles.prefRow} onPress={() => navigate('/help-center')}>
            <Text style={styles.prefLabel}>Help Center</Text>
            <Text style={styles.prefValue}>{">"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.prefRow}
            onPress={() => {
              const url = Platform.select({
                ios: "itms-apps://apps.apple.com/app/id0000000000?action=write-review", // TODO: replace with real App Store ID
                android: "market://details?id=com.hypewave.app",
                default: "https://hypewaveai.com",
              })!;
              openAfterClose(url);
            }}
          >
            <Text style={styles.prefLabel}>Rate the Hypewave App</Text>
            <Text style={styles.prefValue}>{">"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.prefRow}
            onPress={async () => {
              handleClose();
              setTimeout(async () => {
                try {
                  await Share.share({
                    message: "Trade like a pro today, with Hypewave AI. Check it out: https://hypewaveai.com",
                  });
                } catch {}
              }, 220);
            }}
          >
            <Text style={styles.prefLabel}>Share the Hypewave App</Text>
            <Text style={styles.prefValue}>{">"}</Text>
          </TouchableOpacity>
        </View>

        {/* Socials */}
        <View style={styles.socialRow}>
          <TouchableOpacity
            style={styles.socialIcon}
            onPress={() => openAfterClose("https://hypewaveai.com")}
          >
            <Image source={require("@/assets/icons/web.png")} style={styles.socialImage} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialIcon}
            onPress={() => openAfterClose("https://x.com/hypewave_ai")}
          >
            <Image source={require("@/assets/icons/x.png")} style={styles.socialImage} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialIcon}
            onPress={() => openAfterClose("https://discord.gg/4Se7DnvY")}
          >
            <Image source={require("@/assets/icons/discord.png")} style={styles.socialImage} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialIcon}
            onPress={() => openAfterClose("https://t.me/hypewaveai")}
          >
            <Image source={require("@/assets/icons/telegram_icon.png")} style={styles.socialImage} />
          </TouchableOpacity>
        </View>

        {/* Log in/out */}
        {isGuest ? (
          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: "#3ABEFF" }]}
            onPress={() => {
              handleClose();
              setTimeout(() => router.replace('/login'), 220);
            }}
          >
            <Text style={[styles.logoutText, { color: "#000" }]}>Log In to Unlock Features</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Image
            source={require("@/assets/icons/assistant.png")}
            style={{ width: 155, height: 155, marginBottom: 0, marginTop: 0 }}
          />
          <Text style={{ color: "#ccc", fontSize: 19, marginBottom: 4 }}>Hypewave AI</Text>
          <Text style={{ color: "#444", fontSize: 10 }}>© 2025 Hypewave AI</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: "row",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  panel: {
    width: width * 0.78,
    backgroundColor: "#0b214e",
    padding: 20,
    paddingTop: 48,
    justifyContent: "flex-start",
    height: "100%",
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    marginLeft: "auto",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
    marginTop: 13,
  },
  headerCenter: {
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 28,
    backgroundColor: "#001147ff",
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  email: {
    color: "#ccc",
    fontSize: 13,
    marginTop: 2,
  },
  section: {
    marginTop: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#1e2a47",
  },
  sectionTitle: {
    color: "#aaa",
    fontSize: 12,
    marginBottom: 6,
  },
  prefRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    alignItems: "center",
  },
  prefLabel: {
    color: "white",
    fontSize: 14,
  },
  prefValue: {
    color: "#ffffffcc",
    fontSize: 14,
  },
  accountBtnRight: {
    backgroundColor: "#173566",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  accountBtnText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginTop: 16,
  },
  socialIcon: {
    backgroundColor: "#173566",
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  socialImage: {
    width: 20,
    height: 20,
    resizeMode: "contain",
  },
  logoutBtn: {
    backgroundColor: "#3ABEFF",
    marginTop: 20,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  logoutText: {
    color: "#000",
    fontWeight: "bold",
  },
  footer: {
    marginTop: 20,
    alignItems: "center",
  },
});
