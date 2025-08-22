import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/HapticTab';
import { useColorScheme } from '@/hooks/useColorScheme';

// ✅ Import your PNG icons
import AssistantIcon from "@/assets/icons/assistant.svg";
import NewsIcon from "@/assets/icons/news.svg";
import SignalsIcon from "@/assets/icons/signals.svg";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        // tabBarBackground: TabBarBackground,
        tabBarActiveTintColor: "#3ABEFF",         // 👈 Your lighter blue
        tabBarInactiveTintColor: "#d8f3ffff",     // 👈 Dimmed white for inactive
        tabBarStyle: {
          backgroundColor: "#153369ff", 
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 }, // 👈 upward shadow
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 8, // Android
          height: 90,                          // ⬆️ Make it taller to overlap icons
          paddingTop: 14,                      // Add spacing to push icons down into bar
          borderTopWidth: 0,                  // No border
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          position: "absolute",      // 👈 puts it on top of content
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: "Satoshi-Medium",
          marginTop: 12,       // 👈 Pushes text further down
        }
      }}
    >
      <Tabs.Screen
        name="signals"
        options={{
          title: "Signals",
          tabBarIcon: ({ focused }) => (
            <SignalsIcon
              width={70}
              height={70}
              color={focused ? "#3ABEFF" : "#ffffff99"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Assistant',
          tabBarIcon: ({ focused }) => (
            <AssistantIcon
              width={70}
              height={70}
              color={focused ? "#00aaffff" : "#ffffff99"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: 'News',
          tabBarIcon: ({ focused }) => (
          <NewsIcon
            width={70}
            height={70}
            color={focused ? "#3ABEFF" : "#ffffff99"}
          />
        ),
        }}
      />
    </Tabs>
  );
}
