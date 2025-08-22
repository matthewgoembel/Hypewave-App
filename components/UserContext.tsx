// context/UserContext.tsx
import { getSavedPushToken } from '@/utils/pushNotifications';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

const API_URL = 'https://hypewave-ai-engine.onrender.com';

const UserContext = createContext<any>(null);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Send the saved Expo token to backend (best-effort, silent on failure)
  const postPushToken = async (authToken: string) => {
    try {
      const expoToken = await getSavedPushToken();
      if (!expoToken) return;
      await axios.post(
        `${API_URL}/me/push-token`,
        { expo_push_token: expoToken },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
    } catch (e) {
      console.warn('Failed to send push token:', e);
    }
  };

  useEffect(() => {
    let alive = true;
    const initializeUser = async () => {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) {
        if (alive) setLoading(false);
        return;
      }
      try {
        const res = await axios.get(`${API_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!alive) return;
        // include token for future calls
        setUser({ ...res.data, token });

        // send Expo push token now that we have a valid session
        await postPushToken(token);
      } catch (err) {
        console.warn('Invalid token');
        await SecureStore.deleteItemAsync('auth_token');
      } finally {
        if (alive) setLoading(false);
      }
    };
    initializeUser();
    return () => {
      alive = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await axios.post(`${API_URL}/login`, { email, password });
    const { access_token } = res.data;

    await SecureStore.setItemAsync('auth_token', access_token);

    const me = await axios.get(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    setUser({ ...me.data, token: access_token });

    // also send Expo push token right after login
    await postPushToken(access_token);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('auth_token');
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, setUser, login, logout, loading, isGuest: !user }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
export { UserContext };
export default UserProvider;
