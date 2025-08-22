import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { UserProvider } from '@/components/UserContext';
import { useColorScheme } from '@/hooks/useColorScheme';

// NEW:
import { useNotificationRouting, useSetupNotificationChannels } from '@/hooks/useNotificationsBootstrap';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // NEW: initialize notifications & routing
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
      <StatusBar style="light" />
    </UserProvider>
  );
}
