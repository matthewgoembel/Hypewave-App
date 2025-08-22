// components/ui/PageLayout.tsx
import React, { useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  View,
  ViewStyle,
} from "react-native";
import MainHeader from "./MainHeader";

type Props = {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  lastUpdated?: string | null;         // can keep this prop if screens need it elsewhere
  onMenuPress?: () => void;

  scrollRef?: React.RefObject<ScrollView | null>;
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;

  scrollStyle?: ViewStyle;
  contentContainerStyle?: ViewStyle;

  overlayUnderHeader?: React.ReactNode;
  overlayTopOffset?: number;
  overlayZIndex?: number;
  onHeaderMeasured?: (height: number) => void;
};

export default function PageLayout({
  children,
  refreshing = false,
  onRefresh,
  lastUpdated,                // not used here; your screen can still show it under its section title
  onMenuPress,

  scrollRef,
  onScroll,
  scrollEventThrottle = 16,
  scrollStyle,
  contentContainerStyle,

  overlayUnderHeader,
  overlayTopOffset = 0,
  overlayZIndex = 10000,
  onHeaderMeasured,
}: Props) {
  const internalRef = useRef<ScrollView | null>(null);
  const refToUse = scrollRef ?? internalRef;

  const [headerHeight, setHeaderHeight] = useState(0);

  return (
    <View style={{ flex: 1, backgroundColor: "#042050ff", position: "relative" }}>
      {/* Measure header so overlay can sit just under it */}
      <View
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          setHeaderHeight(h);
          onHeaderMeasured?.(h);
        }}
      >
        {/* ✅ remove lastUpdated prop here */}
        <MainHeader onMenuPress={onMenuPress} />
      </View>

      {/* Overlay under header, above content */}
      {overlayUnderHeader ? (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: headerHeight + overlayTopOffset,
            zIndex: overlayZIndex,
          }}
        >
          {overlayUnderHeader}
        </View>
      ) : null}

      <ScrollView
        ref={refToUse}
        style={[{ flex: 1 }, scrollStyle]}
        contentContainerStyle={[
          { paddingBottom: 24, paddingTop: 8, paddingHorizontal: 16 },
          contentContainerStyle,
        ]}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              title={refreshing ? "Checking for new..." : " "}
              titleColor="#3ABEFF"
              tintColor="#3ABEFF"
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </View>
  );
}
