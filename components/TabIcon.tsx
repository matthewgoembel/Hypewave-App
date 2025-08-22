// components/TabIcon.tsx
import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet } from "react-native";

interface TabIconProps {
  source: any;
  focused: boolean;
}

export const TabIcon = ({ source, focused }: TabIconProps) => {
  const scaleAnim = useRef(new Animated.Value(focused ? 1.10 : 0.95)).current;
  const opacityAnim = useRef(new Animated.Value(focused ? 1.05 : 0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1.10 : 0.95,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: focused ? 1.05 : 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  return (
    <Animated.Image
      source={source}
      style={[
        styles.icon,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
      resizeMode="contain"
    />
  );
};

const styles = StyleSheet.create({
  icon: {
    width: 96,
    height: 96,
  },
});
