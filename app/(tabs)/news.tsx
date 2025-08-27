// app/(tabs)/news.tsx
import PageLayout from "@/components/ui/PageLayout";
import SideMenu from "@/components/ui/SideMenu";
import * as Linking from "expo-linking";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  AppState,
  Easing,
  findNodeHandle,
  Image,
  ImageBackground,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import telegramIcon from "../../assets/icons/telegram.png";

import ScrollToTopPill from "@/components/ui/ScrollToTopPill";
import { UserContext } from "@/components/UserContext";
import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import * as SecureStore from "expo-secure-store";

const API_URL = "https://hypewave-ai-engine.onrender.com/news/latest";
const API_BASE = "https://hypewave-ai-engine.onrender.com";
const FEED_RENDER_LIMIT = 24;
const REFRESH_MS = 10_000; // 10s polling while focused

type MediaItem = {
  type: "image" | "video" | "gif";
  url: string;
  preview_url?: string | null;
  width?: number | null;
  height?: number | null;
  duration_ms?: number | null;
  mime_type?: string | null;
};

type NewsItem = {
  text: string;
  source: string;
  display_name?: string;
  link?: string;
  timestamp?: string;
  media_url?: string;
  media?: MediaItem[];
  avatar_url?: string;
};

export default function NewsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  // auto refresh
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);

  // scroll-to-top
  const feedRef = useRef<ScrollView | null>(null);
  const [showToTop, setShowToTop] = useState(false);

  // filters
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedSources, setSelectedSources] = useState<Record<string, boolean>>({});
  const filterBtnRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const [allNews, setAllNews] = useState<NewsItem[]>([]);

  const router = useRouter();
  const { user } = useContext(UserContext) || { user: null };

  const FILTER_KEY = useMemo(
    () => `news_filters_${(user as any)?._id || (user as any)?.id || (user as any)?.email || "guest"}`,
    [user]
  );

  const fetchNews = useCallback(async () => {
    setRefreshing(true);
    try {
      const bust = Date.now();
      const res = await fetch(`${API_URL}?limit=120&_=${bust}`, {
        headers: { "Cache-Control": "no-cache" },
      });
      const data = (await res.json()) as NewsItem[];
      const arr = Array.isArray(data) ? data : [];
      setAllNews(arr);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch (err) {
      console.error("Failed to fetch news:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);


  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(FILTER_KEY);
        if (saved) setSelectedSources(JSON.parse(saved));
      } catch {}
      fetchNews();
    })();
  }, [FILTER_KEY, fetchNews]);

  // helpers
  const resolveUrl = (u?: string | null) => (!u ? null : u.startsWith("http") ? u : `${API_BASE}${u}`);
  const isVideoUrl = (u: string) => /\.(mp4|mov|m4v|webm)(\?|$)/i.test(u) || /\/video\/upload\//.test(u);
  const COVER: any = (ResizeMode as any)?.COVER ?? "cover";

  const pickMediaArray = (item: NewsItem): MediaItem[] => {
    if (Array.isArray(item.media) && item.media.length) return item.media;
    if (item.media_url) {
      const url = resolveUrl(item.media_url)!;
      return [{ type: isVideoUrl(url) ? "video" : (url.toLowerCase().endsWith(".gif") ? "gif" : "image"), url }];
    }
    return [];
  };

  const renderMedia = (item: NewsItem) => {
    const arr = pickMediaArray(item);
    if (!arr.length) return null;

    if (arr.length === 1) {
      const m = arr[0];
      if (m.type === "video") {
        return (
          <View style={{ width: "100%", height: 200, borderRadius: 12, overflow: "hidden", marginTop: 10, backgroundColor: "#0B1324" }}>
            <Video source={{ uri: m.url }} useNativeControls resizeMode={COVER} shouldPlay={false} style={{ width: "100%", height: "100%" }} />
          </View>
        );
      }
      return (
        <Image
          source={{ uri: m.url }}
          style={{ width: "100%", height: 220, borderRadius: 12, overflow: "hidden", marginTop: 10, backgroundColor: "#0B1324" }}
          resizeMode="cover"
        />
      );
    }

    if (arr.length === 2 && arr.every(m => m.type !== "video")) {
      return (
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
          {arr.map((m, i) => (
            <Image key={i} source={{ uri: m.url }} style={{ width: "49%", height: 180, borderRadius: 12, backgroundColor: "#0B1324" }} resizeMode="cover" />
          ))}
        </View>
      );
    }

    const first4 = arr.slice(0, 4);
    return (
      <View style={{ marginTop: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
          {first4.slice(0, 2).map((m, i) =>
            m.type === "video" ? (
              <View key={i} style={{ width: "49%", height: 140, borderRadius: 12, overflow: "hidden", backgroundColor: "#000" }}>
                <Video source={{ uri: m.url }} useNativeControls resizeMode={COVER} shouldPlay={false} style={{ width: "100%", height: "100%" }} />
              </View>
            ) : (
              <Image key={i} source={{ uri: m.url }} style={{ width: "49%", height: 140, borderRadius: 12, backgroundColor: "#0B1324" }} />
            )
          )}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {first4.slice(2, 4).map((m, i) =>
            m.type === "video" ? (
              <View key={i} style={{ width: "49%", height: 140, borderRadius: 12, overflow: "hidden", backgroundColor: "#000" }}>
                <Video source={{ uri: m.url }} useNativeControls resizeMode={COVER} shouldPlay={false} style={{ width: "100%", height: "100%" }} />
              </View>
            ) : (
              <Image key={i} source={{ uri: m.url }} style={{ width: "49%", height: 140, borderRadius: 12, backgroundColor: "#0B1324" }} />
            )
          )}
        </View>
        {arr.length > 4 ? <Text style={{ color: "#ffffffaa", fontSize: 12, textAlign: "right", marginTop: 6 }}>+{arr.length - 4} more</Text> : null}
      </View>
    );
  };

  // build list of channels from the larger window
  const channels = useMemo(() => {
    const map = new Map<string, { key: string; label: string }>();
    for (const n of allNews) {
      const key = n.source || "unknown";
      const label = n.display_name || n.source || "Unknown";
      if (!map.has(key)) map.set(key, { key, label });
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [allNews]);

  // initialize & keep filters in sync with new channels
  useEffect(() => {
    if (!channels.length) return;

    // If no saved filters, initialize “all on”
    if (Object.keys(selectedSources).length === 0) {
      const init: Record<string, boolean> = {};
      channels.forEach(c => (init[c.key] = true));
      setSelectedSources(init);
      SecureStore.setItemAsync(FILTER_KEY, JSON.stringify(init)).catch(() => {});
      return;
    }

    // If new sources appear later, add them as checked
    const next = { ...selectedSources };
    let changed = false;
    channels.forEach(c => {
      if (!(c.key in next)) {
        next[c.key] = true;
        changed = true;
      }
    });
    if (changed) {
      setSelectedSources(next);
      SecureStore.setItemAsync(FILTER_KEY, JSON.stringify(next)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels]);

  // Auto-refresh while this screen is focused and the app is active
  useFocusEffect(
    React.useCallback(() => {
      let mounted = true;

      const start = () => {
        if (intervalRef.current) return;
        intervalRef.current = setInterval(() => {
          if (appStateRef.current === "active" && mounted) {
            fetchNews();
          }
        }, REFRESH_MS);
      };

      const stop = () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };

      const sub = AppState.addEventListener("change", (next) => {
        appStateRef.current = next;
        if (next === "active") start();
        else stop();
      });

      fetchNews(); // immediate on focus
      start();

      return () => {
        mounted = false;
        sub.remove();
        stop();
      };
    }, [fetchNews])
  );

  // Toggle a source on/off and persist
  const toggleSource = (key: string) => {
    setSelectedSources(prev => {
      const isChecked = prev[key] !== false; // default = checked
      const next = { ...prev, [key]: isChecked ? false : true };
      SecureStore.setItemAsync(FILTER_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  // Quick actions: select all / none
  const selectAll = () => {
    const next: Record<string, boolean> = {};
    channels.forEach(c => (next[c.key] = true));
    setSelectedSources(next);
    SecureStore.setItemAsync(FILTER_KEY, JSON.stringify(next)).catch(() => {});
  };
  const selectNone = () => {
    const next: Record<string, boolean> = {};
    channels.forEach(c => (next[c.key] = false));
    setSelectedSources(next);
    SecureStore.setItemAsync(FILTER_KEY, JSON.stringify(next)).catch(() => {});
  };

  // final filtered list
  const filteredNews = useMemo(() => {
    if (!allNews.length) return [];
    if (Object.keys(selectedSources).length === 0) return allNews;
    return allNews.filter(n => {
      const key = n.source || "unknown";
      return selectedSources[key] !== false;
    });
  }, [allNews, selectedSources]);

  const getAvatarSource = (item: NewsItem) => {
    const raw =
      item.avatar_url ??
      (item as any).avatar ??
      (item as any).profile_image ??
      null;

    if (!raw) return require("@/assets/icons/assistant.png");

    // Make absolute if backend gave /media/...
    let url = resolveUrl(raw) || raw;

    // Android blocks http by default; upgrade if needed
    if (url.startsWith("http://")) url = url.replace("http://", "https://");

    // Light cache-bust so avatars refresh when channels change them
    if (item.timestamp) {
      url += (url.includes("?") ? "&" : "?") + "_=" + encodeURIComponent(item.timestamp);
    }

    return { uri: url };
  };


  const cleanTelegramText = (raw?: string) => {
    if (!raw) return "";
    let s = raw;
    s = s.replace(
      /"(\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*)"/gu,
      "$1"
    );
    s = s.replace(
      /\s*(\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*?)\s*/gu,
      " $1 "
    );
    return s;
  };

  const mdStyles = {
    body: { color: "#ffffffcc", fontSize: 13, lineHeight: 18 },
    paragraph: { marginTop: 6, marginBottom: 0 },
    strong: { color: "#fff", fontWeight: "700" },
    link: { color: "#3ABEFF" },
    bullet_list: { marginTop: 6, marginBottom: 0 },
    ordered_list: { marginTop: 6, marginBottom: 0 },
    list_item: { marginTop: 2, marginBottom: 2 },
    code_inline: {
      backgroundColor: "rgba(255,255,255,0.08)",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      color: "#fff",
    },
  } as const;

  const renderCard = ({ item }: { item: NewsItem }) => (
    <View
      style={{
        backgroundColor: "#173566",
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
        shadowColor: "#3ABEFF99",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      }}
    >
      {/* Header Row */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              backgroundColor: "#0e2552ff",
              borderRadius: 99,
              width: 38,
              height: 38,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 10,
              overflow: "hidden",
            }}
          >
            <Image source={getAvatarSource(item)} style={{ width: 38, height: 38 }} />
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", maxWidth: 200 }}>
            <Text style={{ color: "white", fontSize: 14, fontWeight: "600", marginRight: 6 }} numberOfLines={1} ellipsizeMode="tail">
              {item.display_name || item.source}
            </Text>
            <Text style={{ color: "#ffffff88", fontSize: 13 }} numberOfLines={1} ellipsizeMode="tail">
              @{item.source}
            </Text>
          </View>
        </View>

        {item.link && (
          <TouchableOpacity onPress={() => Linking.openURL(item.link!)}>
            <Image source={telegramIcon} style={{ width: 18, height: 18, tintColor: "#3ABEFF" }} resizeMode="contain" />
          </TouchableOpacity>
        )}
      </View>

      {!!item.text && (
        <View style={{ marginTop: 8 }}>
          <Markdown
            style={mdStyles as any}
            onLinkPress={(url) => {
              try {
                Linking.openURL(url);
              } catch {}
              return false;
            }}
          >
            {cleanTelegramText(item.text)}
          </Markdown>
        </View>
      )}
      {renderMedia(item)}
      {item.timestamp && (
        <Text style={{ color: "#ffffff66", marginTop: 6, fontSize: 11 }}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
      )}
    </View>
  );

  // dropdown open/close
  const openDropdown = () => {
    const node = findNodeHandle(filterBtnRef.current);
    if (!node) return;
    UIManager.measureInWindow(node, (x, y, w, h) => {
      setAnchor({ x, y, w, h });
      setFilterOpen(true);
      dropdownAnim.setValue(0);
      Animated.timing(dropdownAnim, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    });
  };
  const closeDropdown = () => {
    Animated.timing(dropdownAnim, { toValue: 0, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(({ finished }) => {
      if (finished) setFilterOpen(false);
    });
  };
  const dropdownStyle = {
    opacity: dropdownAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
    transform: [
      { translateY: dropdownAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
      { scale: dropdownAnim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
    ],
  };

  // track scroll from PageLayout's ScrollView
  const onFeedScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset?.y ?? 0;
    setShowToTop(y > 350);
  };

  return (
    <>
      <PageLayout
        refreshing={refreshing}
        onRefresh={() => {
          feedRef.current?.scrollTo({ y: 0, animated: false });
          fetchNews();
        }}
        lastUpdated={lastUpdated}
        onMenuPress={() => setMenuVisible(true)}
        scrollRef={feedRef}
        onScroll={onFeedScroll}
        scrollEventThrottle={16}
        scrollStyle={{ backgroundColor: "#042050ff" }}
        contentContainerStyle={{ paddingBottom: 48 }}
        overlayUnderHeader={
          <ScrollToTopPill
            visible={showToTop}
            label="Latest"
            onPress={() => feedRef.current?.scrollTo({ y: 0, animated: true })}
            style={{ marginTop: 10, marginRight: 12, alignSelf: "center" }}
          />
        }
      >
        {/* Header strip */}
        <View style={{ marginTop: 4, marginBottom: 16 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 8,
              marginBottom: -6,
            }}
          >
            <TouchableOpacity
              ref={filterBtnRef}
              onPress={() => (filterOpen ? closeDropdown() : openDropdown())}
              activeOpacity={0.8}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: "#0b2a54",
                alignItems: "center",
                justifyContent: "center",
              }}
              accessibilityLabel="Filter sources"
            >
              <Ionicons name="filter-outline" size={18} color="#3ABEFF" />
            </TouchableOpacity>

            <Text style={{ color: "white", fontSize: 18, fontWeight: "600" }}>Market News</Text>

            <View style={{ marginRight: -8 }}>
              <TouchableOpacity onPress={() => router.push("/economic-news")}>
                <ImageBackground
                  source={require("@/assets/icons/calendar.png")}
                  style={{ width: 40, height: 40, justifyContent: "center", alignItems: "center" }}
                  imageStyle={{ resizeMode: "contain" }}
                >
                  <View style={{ alignItems: "center", marginTop: 4, marginBottom: 2 }}>
                    <Text style={{ fontSize: 7, color: "#fff", fontWeight: "600", lineHeight: 10 }}>
                      {new Date().toLocaleString("default", { month: "short" })}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: "bold", color: "#fff", lineHeight: 12 }}>
                      {new Date().getDate()}
                    </Text>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            </View>
          </View>

          {lastUpdated && (
            <Text style={{ color: "#ffffff88", fontSize: 10, textAlign: "center", marginBottom: 6 }}>
              Last updated: {lastUpdated}
            </Text>
          )}
          <View style={{ height: 0.5, backgroundColor: "#0ea2c777", marginHorizontal: 2 }} />
        </View>

        {/* Feed */}
        {loading ? (
          <ActivityIndicator size="large" color="#3ABEFF" />
        ) : filteredNews.length > 0 ? (
          <>
            {filteredNews.slice(0, FEED_RENDER_LIMIT).map((item, idx) => (
              <React.Fragment key={idx}>{renderCard({ item })}</React.Fragment>
            ))}
          </>
        ) : (
          <Text style={{ color: "#ffffff88", textAlign: "center", marginTop: 16 }}>
            No news for selected filters.
          </Text>
        )}
      </PageLayout>

      {menuVisible && <SideMenu onClose={() => setMenuVisible(false)} />}

      {/* Filter dropdown */}
      {filterOpen && anchor && (
        <>
          <Pressable
            onPress={closeDropdown}
            style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, zIndex: 998 }}
          />
          <Animated.View
            style={[
              {
                position: "absolute",
                left: Math.max(8, anchor.x),
                top: anchor.y + anchor.h + 6,
                width: 220,
                maxHeight: 320,
                backgroundColor: "#0f1f3b",
                borderRadius: 10,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
                zIndex: 999,
                elevation: 20,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 6,
              },
              dropdownStyle,
            ]}
          >
            {/* quick actions */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: "rgba(255,255,255,0.04)",
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255,255,255,0.06)",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Sources</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity onPress={selectAll}>
                  <Text style={{ color: "#3ABEFF", fontSize: 12, fontWeight: "600" }}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={selectNone}>
                  <Text style={{ color: "#3ABEFF", fontSize: 12, fontWeight: "600" }}>None</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={{ maxHeight: 260 }}>
              {channels.map((c) => {
                const checked = selectedSources[c.key] !== false;
                return (
                  <TouchableOpacity
                    key={c.key}
                    onPress={() => toggleSource(c.key)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottomWidth: 1,
                      borderBottomColor: "rgba(255,255,255,0.06)",
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 14 }} numberOfLines={1} ellipsizeMode="tail">
                      {c.label}
                    </Text>
                    <Ionicons
                      name={checked ? "checkbox-outline" : "square-outline"}
                      size={18}
                      color={checked ? "#3ABEFF" : "#ffffff99"}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        </>
      )}
    </>
  );
}
