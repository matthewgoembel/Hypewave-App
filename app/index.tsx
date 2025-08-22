// app/index.tsx
import { useUser } from '@/components/UserContext';
import { Redirect } from 'expo-router';

export default function Index() {
  const { user, loading } = useUser();

  if (loading) return null;

  if (user?.guest) {
    return <Redirect href="/(tabs)/chat" />;
  }

  if (user) {
    return <Redirect href="/(tabs)/chat" />;
  }

  return <Redirect href="/login" />;
}