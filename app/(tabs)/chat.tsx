import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import MainHeader from "@/components/ui/MainHeader";
import SideMenu from "@/components/ui/SideMenu";

const API_URL = "https://hypewave-ai-engine.onrender.com/chat";

type ChatMessage = {
  text: string;
  isUser: boolean;
  createdAt: number; // epoch ms
};

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [logoVisible, setLogoVisible] = useState(true);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const [headerHeight, setHeaderHeight] = useState(60);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [typingDots, setTypingDots] = useState(".");
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);
  const [inputBarHeight, setInputBarHeight] = useState(64);

  const scrollRef = useRef<ScrollView>(null);
  // Track if user is near bottom to decide autoscroll behavior (optional – still autoscroll by default)
  const atBottomRef = useRef(true);

  const onHeaderLayout = (e: LayoutChangeEvent) => {
    setHeaderHeight(e.nativeEvent.layout.height || 60);
  };

  

  const { prefill } = useLocalSearchParams<{ prefill?: string }>();

  // Ref for focusing the input when we arrive with a prefill
  const inputRef = useRef<TextInput>(null);

  // Initialize input from prefill once when screen mounts
  useEffect(() => {
    if (typeof prefill === "string" && prefill.length) {
      setInputText(prefill);
      setLogoVisible(false);             // hide splash since user is ready to type
      // Focus the input after a tick so layout is ready
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [prefill]);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const subShow = Keyboard.addListener(showEvt, () => setIsKeyboardOpen(true));
    const subHide = Keyboard.addListener(hideEvt, () => setIsKeyboardOpen(false));

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);


  // Animated typing dots
  useEffect(() => {
    if (!isTyping) return;
    const id = setInterval(() => {
      setTypingDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 350);
    return () => clearInterval(id);
  }, [isTyping]);

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });

  const handleSend = async () => {
    if (!inputText.trim() && !selectedImage) return;

    const userMsg: ChatMessage = {
      text: inputText,
      isUser: true,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLogoVisible(false);
    setIsTyping(true);

    const formData = new FormData();
    formData.append("input", userMsg.text);
    formData.append("bias", "neutral");
    formData.append("timeframe", "1H");
    formData.append("entry_intent", "scalp");

    if (selectedImage) {
      const fileName = selectedImage.uri?.split("/").pop() || "image.jpg";
      const fileType = selectedImage.mimeType || "image/jpeg";
      formData.append("image", {
        uri: selectedImage.uri,
        name: fileName,
        type: fileType,
      } as any);
    }

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      const aiMsg: ChatMessage = {
        text: json.result,
        isUser: false,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errMsg: ChatMessage = {
        text: "⚠️ Something went wrong.",
        isUser: false,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
      setSelectedImage(null);
    }
  };

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: false,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      setSelectedImage(result.assets[0]);
      setLogoVisible(false);
    }
  };

  const scrollToEnd = () => {
    scrollRef.current?.scrollToEnd({ animated: true });
    atBottomRef.current = true;
    setShowScrollToLatest(false);
  };

  // Detect if user scrolled away from bottom
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const threshold = 32; // px tolerance from the bottom
    const distanceFromBottom =
      contentSize.height - layoutMeasurement.height - contentOffset.y;
    const isAtBottom = distanceFromBottom <= threshold;

    atBottomRef.current = isAtBottom;
    setShowScrollToLatest(!isAtBottom);
  };

  // Auto-scroll when new content arrives only if user is at bottom
  const onContentSizeChange = () => {
    if (atBottomRef.current) {
      scrollToEnd();
    }
  };

  // Dynamic bottom padding: above tab bar at rest; kiss keyboard when open
  const REST_GAP = tabBarHeight - 12;
  const KEYBOARD_GAP = 0;
  const bottomGutter = isKeyboardOpen ? KEYBOARD_GAP : REST_GAP;

  // Compensate KAV lift so we don't over-lift when keyboard shows
  const kavOffset = Math.max(0, headerHeight - REST_GAP);

  // Floating button bottom position (sits just above the input bar)
  const floatBottom =
    bottomGutter + inputBarHeight + (isKeyboardOpen ? 8 : Math.max(insets.bottom, 10) + 8);

  return (
    <View style={{ flex: 1, backgroundColor: "#00163a" }}>
      {/* Pinned header */}
      <View
        onLayout={onHeaderLayout}
        style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 }}
      >
        <MainHeader onMenuPress={() => setMenuVisible(true)} />
      </View>

      {/* KAV lifts content; offset compensates for resting bottom gutter */}
      <KeyboardAvoidingView
        style={{ flex: 1, paddingTop: headerHeight }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={kavOffset}
      >
        {/* Column: ScrollView + (preview) + InputBar */}
        <View style={{ flex: 1, paddingBottom: bottomGutter }}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{ padding: 16, paddingBottom: 16 }}
            onContentSizeChange={onContentSizeChange}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            <View style={styles.versionContainer}>
              <Text style={styles.versionText}>
                Hypewave <Text style={{ opacity: 0.6 }}>1.0</Text> ›
              </Text>
            </View>

            {logoVisible && (
              <View style={styles.logoContainer}>
                <Image
                  source={require("@/assets/icons/assistant.png")}
                  style={styles.logo}
                />
                <Text style={styles.logoText}>HYPEWAVE AI</Text>
              </View>
            )}

            {messages.map((msg, idx) => {
              const bubble = (
                <View style={msg.isUser ? styles.userMsg : styles.botMsg}>
                  {msg.isUser ? (
                    <Text style={styles.msgText}>{msg.text}</Text>
                  ) : (
                    <Markdown
                      style={{
                        body: styles.msgText,
                        heading1: { fontSize: 18, fontWeight: "700", color: "#fff" },
                        heading2: { fontSize: 16, fontWeight: "600", color: "#ffffffdd" },
                        paragraph: { marginTop: 4, marginBottom: 6 },
                        bullet_list: { paddingLeft: 12 },
                        list_item: { flexDirection: "row", alignItems: "flex-start" },
                        bullet: { color: "#4aaaff" },
                        text: { color: "#f5faff" },
                        strong: { color: "#fff" },
                        code_block: {
                          backgroundColor: "#0e1f3d",
                          borderRadius: 8,
                          padding: 8,
                        },
                      }}
                    >
                      {msg.text}
                    </Markdown>
                  )}
                </View>
              );

              return (
                <View key={idx} style={styles.messageContainer}>
                  {bubble}
                  <Text
                    style={[
                      styles.timeText,
                      msg.isUser ? styles.timeRight : styles.timeLeft,
                    ]}
                  >
                    {formatTime(msg.createdAt)}
                  </Text>
                </View>
              );
            })}

            {/* Typing bubble with animated dots */}
            {isTyping && (
              <View style={styles.messageContainer}>
                <View style={styles.typingBubble}>
                  <Text style={styles.msgText}>{typingDots}</Text>
                </View>
                <Text style={[styles.timeText, styles.timeLeft]}>
                  {formatTime(Date.now())}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Attachment preview above the input bar */}
          {selectedImage && (
            <View style={styles.attachmentPreview}>
              <Image source={{ uri: selectedImage.uri }} style={styles.attachmentThumb} />
              <TouchableOpacity
                onPress={() => setSelectedImage(null)}
                style={styles.removeAttachmentBtn}
              >
                <Text style={styles.removeAttachmentText}>×</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Scroll-to-latest floating button */}
          {showScrollToLatest && (
            <TouchableOpacity
              style={[styles.scrollToBtn, { bottom: floatBottom }]}
              onPress={scrollToEnd}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-down" size={22} color="#0b214e" />
            </TouchableOpacity>
          )}

          {/* Input bar */}
          <View
            style={[
              styles.inputBarContainer,
              {
                paddingBottom: isKeyboardOpen ? 0 : Math.max(insets.bottom, 10),
              },
            ]}
            onLayout={(e) => setInputBarHeight(e.nativeEvent.layout.height)}
          >
            <View style={styles.inputBar}>
              <TouchableOpacity onPress={handleImagePick} style={styles.plusButton}>
                <Text style={styles.plus}>＋</Text>
              </TouchableOpacity>

              <TextInput
                ref={inputRef}
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask anything..."
                placeholderTextColor="#ccc"
                multiline
              />

              <TouchableOpacity onPress={handleSend}>
                <Image
                  source={
                    inputText.trim() || selectedImage
                      ? require("@/assets/icons/send.png")
                      : require("@/assets/icons/voice.gif")
                  }
                  style={styles.icon}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {menuVisible && <SideMenu onClose={() => setMenuVisible(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  versionContainer: { paddingLeft: 16, marginTop: 12 },
  versionText: { color: "#ffffffdd", fontSize: 14, fontWeight: "500" },

  logoContainer: { alignItems: "center", marginTop: 100 },
  logo: { width: 180, height: 180 },
  logoText: { color: "white", fontSize: 24, fontWeight: "bold", marginTop: -10 },

  messageContainer: {
    marginBottom: 8,
    maxWidth: "100%",
  },

  // Sleeker bubbles
  userMsg: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(0, 164, 240, 1)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderBottomRightRadius: 6,
    marginBottom: 4,
    maxWidth: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  botMsg: {
    alignSelf: "flex-start",
    backgroundColor: "#102244",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginBottom: 4,
    maxWidth: "88%",
    borderLeftWidth: 3,
    borderLeftColor: "#3ABEFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  typingBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#112849",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    maxWidth: "60%",
    borderLeftWidth: 3,
    borderLeftColor: "#3ABEFF",
  },

  msgText: {
    color: "#f5faff",
    fontSize: 15,
    lineHeight: 20,
  },

  timeText: {
    fontSize: 11,
    color: "#9fb3d6",
    marginTop: 4,
  },
  timeLeft: {
    alignSelf: "flex-start",
    marginLeft: 6,
  },
  timeRight: {
    alignSelf: "flex-end",
    marginRight: 6,
  },

  // Preview + Input Bar
  attachmentPreview: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
  },
  attachmentThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  removeAttachmentBtn: {
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  removeAttachmentText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },

  // Floating scroll-to-latest button
  scrollToBtn: {
    position: "absolute",
    right: 16,
    zIndex: 50,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 174, 255, 1)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },

  inputBarContainer: {
    paddingHorizontal: 12,
    backgroundColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0a1a3c",
    padding: 8,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#1e2e4a",
  },
  plusButton: {
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    width: 48,
    height: 48,
    borderRadius: 22,
    backgroundColor: "#102244",
  },
  plus: { fontSize: 32, color: "#4aaaff" },
  input: {
    flex: 1,
    minHeight: 50,
    maxHeight: 120,
    color: "white",
    backgroundColor: "#102244",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  icon: { width: 48, height: 48, marginLeft: 8 },
});
