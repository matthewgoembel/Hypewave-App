// app/login.tsx
import { useUser } from '@/components/UserContext';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AuthSessionResult, makeRedirectUri, TokenResponse } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { login, setUser } = useUser();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const guestUser = { guest: true, username: 'Guest', email: 'guest@hypewave.ai' };

  // Pull Google client ID from app.json -> extra.auth.google.iosClientId
  const googleCfg = (Constants.expoConfig as any)?.extra?.auth?.google || {};
  const clientId = (Constants.expoConfig as any)?.extra?.auth?.google?.iosClientId;

  const redirectUri = makeRedirectUri({
    native: `com.googleusercontent.apps.${clientId?.replace('.apps.googleusercontent.com','')}:/oauthredirect`,
  });

  // Request an ID token from Google
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId,
    responseType: 'id_token',
    redirectUri,
    scopes: ['openid', 'email', 'profile'],
    extraParams: { prompt: 'select_account' },
  });

  useEffect(() => {
    (async () => {
      if (response?.type !== 'success') return;
      const typed = response as AuthSessionResult & { authentication: TokenResponse };
      const idToken = typed.authentication?.idToken;
      if (!idToken) {
        Alert.alert('Google Login Failed', 'No ID token returned.');
        return;
      }
      await handleGoogleLogin(idToken);
    })();
  }, [response]);

  const handleGoogleLogin = async (idToken: string) => {
    try {
      const res = await fetch('https://hypewave-ai-engine.onrender.com/login/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      });
      const data = await res.json();

      if (res.ok && data?.access_token) {
        await SecureStore.setItemAsync('auth_token', data.access_token);
        const userRes = await fetch('https://hypewave-ai-engine.onrender.com/me', {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        const userInfo = await userRes.json();
        setUser({ ...userInfo, token: data.access_token });
        router.replace('/chat');
      } else {
        Alert.alert('Google Login Failed', data?.detail || 'Server rejected the token.');
      }
    } catch (err) {
      console.error('Google login error:', err);
      Alert.alert('Login Failed', 'Network/server error.');
    }
  };

  const handleLogin = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password.trim()) {
      Alert.alert('Missing info', 'Please enter both email and password.');
      return;
    }
    try {
      await login(trimmedEmail, password);
      router.replace('/chat');
    } catch {
      Alert.alert('Login failed', 'Invalid credentials');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity
        style={styles.skip}
        onPress={() => { setUser(guestUser); router.replace('/chat'); }}
      >
        <Text style={styles.skipText}>SKIP &gt;</Text>
      </TouchableOpacity>

      <Image source={require('@/assets/icons/signals.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>HYPEWAVE</Text>
      <Text style={styles.subtitle}>Your personal trading assistant</Text>

      <TouchableOpacity style={styles.googleBtn} onPress={() => promptAsync()} disabled={!request}>
        <Text style={styles.googleText}>Continue with Google</Text>
      </TouchableOpacity>

      <View style={styles.dividerContainer}>
        <View style={styles.line} />
        <Text style={styles.or}>or</Text>
        <View style={styles.line} />
      </View>

      <TextInput
        placeholder="Email"
        placeholderTextColor="#ccc"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        placeholderTextColor="#ccc"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <TouchableOpacity
        style={[styles.loginBtn, (!email.trim() || !password.trim()) && { opacity: 0.4 }]}
        onPress={handleLogin}
        disabled={!email.trim() || !password.trim()}
      >
        <Text style={styles.loginText}>Continue with Username or Email</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/signup')}>
        <Text style={styles.signupLink}>
          Don’t have an account? <Text style={styles.signupLinkBold}>Sign up here!</Text>
        </Text>
      </TouchableOpacity>

      <Text style={styles.legal}>
        By continuing, you acknowledge that you’ve read and agree fully to our{' '}
        <Text style={styles.link}>Terms of Service</Text> and <Text style={styles.link}>Privacy Policy</Text>.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', paddingTop: 160, paddingHorizontal: 24, backgroundColor: '#0084FF' },
  skip: { position: 'absolute', top: 60, right: 20 },
  skipText: { color: 'white', fontWeight: 'bold' },
  logo: { width: 120, height: 120, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  subtitle: { fontSize: 16, color: 'white', marginBottom: 40 },
  googleBtn: { backgroundColor: '#0D1A43', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 10, marginBottom: 24, width: '100%', alignItems: 'center' },
  googleText: { color: 'white', fontWeight: '600' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  line: { flex: 1, height: 1, backgroundColor: 'white' },
  or: { marginHorizontal: 8, padding: 10, color: 'white' },
  input: { width: '100%', height: 48, backgroundColor: '#eaf1ffff', borderRadius: 8, paddingHorizontal: 12, marginBottom: 12 },
  loginBtn: { backgroundColor: '#0D1A43', paddingVertical: 14, borderRadius: 10, marginTop: 10, width: '100%', alignItems: 'center' },
  loginText: { color: 'white', fontWeight: '600' },
  legal: { fontSize: 12, color: 'white', textAlign: 'center', marginTop: 30, paddingHorizontal: 10 },
  link: { textDecorationLine: 'underline' },
  signupLink: { color: 'white', fontSize: 13, marginTop: 18, textAlign: 'center' },
  signupLinkBold: { textDecorationLine: 'underline', fontWeight: '600' },
});
