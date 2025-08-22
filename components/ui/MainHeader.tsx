// components/ui/MainHeader.tsx
import { useUser } from "@/components/UserContext";
import { Ionicons } from "@expo/vector-icons";
import { Image, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface MainHeaderProps {
  onMenuPress?: () => void;
  showBack?: boolean;
  onBackPress?: () => void;
  title?: string; // fallback if no user name
}

export default function MainHeader({
  onMenuPress,
  showBack = false,
  onBackPress,
  title = "Hypewave AI",
}: MainHeaderProps) {
  const { user } = useUser();
  const isGuest = user?.guest;
  const displayName = user?.username || title || "Trader";
  const avatarUri = user?.avatar_url || null;

  return (
    <SafeAreaView
      style={{ backgroundColor: "#153369ff", marginTop: showBack ? -60 : 0 }}
      edges={["top"]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#153369ff" translucent={false} />

      <View
        style={{
          paddingBottom: 14,
          paddingHorizontal: 16,
          borderBottomLeftRadius: 10,
          borderBottomRightRadius: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 6,
        }}
      >
        {/* Top row */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Left section */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {showBack && (
              <TouchableOpacity onPress={onBackPress} style={{ marginRight: 8 }}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
            )}

            <Image
              source={
                avatarUri
                  ? { uri: avatarUri }
                  : require("@/assets/icons/default-avatar.png")
              }
              style={{
                marginRight: 9,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "#325c9246",
              }}
            />
            <Text
              style={{
                color: "white",
                fontSize: 16,
                fontWeight: "500",
                marginRight: 4,
              }}
            >
              {displayName}
            </Text>
            {!isGuest && (
              <Ionicons name="chevron-down" size={16} color="#ffffffaa" />
            )}
          </View>

          {/* Right section */}
          <TouchableOpacity onPress={onMenuPress}>
            <Image
              source={require("@/assets/icons/menu.png")}
              style={{ width: 42, height: 42, tintColor: "white" }}
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
