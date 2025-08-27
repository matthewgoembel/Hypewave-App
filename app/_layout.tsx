// app/_layout.tsx
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { UserProvider, useUser } from '@/components/UserContext';
import { useColorScheme } from '@/hooks/useColorScheme';

// your existing notification bootstrap
import { useNotificationRouting, useSetupNotificationChannels } from '@/hooks/useNotificationsBootstrap';

// ✅ import the modal
import Waiver from '@/components/ui/Waiver';

const API = 'https://hypewave-ai-engine.onrender.com';

function WaiverGate() {
  const { user, setUser } = useUser();

  // show only for logged-in, non-guest users who haven't signed
  const needsWaiver = !!user && !user.guest && !(user.waiver?.signed === true);

  if (!needsWaiver) return null;

  return (
    <Waiver
      visible
      onConfirm={async () => {
        const res = await fetch(`${API}/me/waiver`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user?.token}`,
          },
          body: JSON.stringify({ version: '2025-08-23' }), // optional, matches backend default
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.detail || 'Failed to record acceptance');
        // update in memory so the modal disappears immediately
        setUser({ ...user, waiver: data.waiver });
      }}
      // no onRequestClose → fully blocking
    />
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useSetupNotificationChannels();
  useNotificationRouting();

  if (!loaded) return null;

  return (
    <UserProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="economic-news" options={{ headerShown: false }} />
      </Stack>
      {/* ✅ overlays the entire app when needed */}
      <WaiverGate />
      <StatusBar style="light" />
    </UserProvider>
  );
}
