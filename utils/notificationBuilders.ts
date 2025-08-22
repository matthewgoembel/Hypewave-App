// hooks/useNotificationsBootstrap.ts
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Linking, Platform } from 'react-native';

export function useSetupNotificationChannels() {
  useEffect(() => {
    // ✅ Return all fields required by the current NotificationBehavior type
    Notifications.setNotificationHandler({
      handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        // iOS-specific flags (safe to include always; Android ignores them)
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('news', {
          name: 'News alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 100, 250],
          lightColor: '#0EA5E9',
        });
      }
    })();
  }, []);
}

export function useNotificationRouting() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const last = await Notifications.getLastNotificationResponseAsync();
      if (last) {
        const link = last.notification.request.content.data?.link as string | undefined;
        if (link) Linking.openURL(link);
        else router.push('/news');
      }
    })();

    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const link = resp.notification.request.content.data?.link as string | undefined;
      if (link) Linking.openURL(link);
      else router.push('/news');
    });

    return () => sub.remove();
  }, [router]);
}
