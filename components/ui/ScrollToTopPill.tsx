// components/ui/ScrollToTopPill.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Text, TouchableOpacity, ViewStyle } from "react-native";

type Props = {
  visible: boolean;
  label?: string;
  onPress: () => void;
  style?: ViewStyle;
};

export default function ScrollToTopPill({ visible, label = "Jump to latest", onPress, style }: Props) {
  const a = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(a, {
      toValue: visible ? 1 : 0,
      duration: visible ? 180 : 140,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[
        {
          opacity: a,
          transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
        },
        style,
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        accessibilityLabel="Scroll to top"
        style={{
          alignSelf: "center",
          backgroundColor: "#0f274f",
          borderColor: "rgba(58,190,255,0.35)",
          borderWidth: 1,
          paddingVertical: 8,
          paddingHorizontal: 14,
          borderRadius: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Ionicons name="arrow-up" size={16} color="#3ABEFF" />
        <Text style={{ color: "#fff", fontWeight: "700" }}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
