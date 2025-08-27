// app/login.tsx
import { useUser } from '@/components/UserContext';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const API = 'https://hypewave-ai-engine.onrender.com';

// ---- Optional safe dynamic import for Apple so TS compiles even if not installed yet
let AppleAuth: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AppleAuth = require('expo-apple-authentication');
} catch {
  AppleAuth = undefined;
}

export default function LoginScreen() {
  const { login, setUser } = useUser();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const guestUser = { guest: true, username: 'Guest', email: 'guest@hypewave.ai' };

  // Choose the correct Google client ID for the current runtime
  const googleCfg = (Constants.expoConfig as any)?.extra?.auth?.google ?? {};
  const clientId: string | undefined = useMemo(() => {
    const inExpoGo = Constants.appOwnership === 'expo';
    // Use Expo client in Expo Go; iOS client in a real build
    return inExpoGo ? googleCfg.expoClientId : googleCfg.iosClientId;
  }, [googleCfg]);

  // ✅ Native-safe ID token request (no manual redirectUri)
  const [gRequest, gResponse, gPrompt] = Google.useIdTokenAuthRequest({
    clientId, // single field avoids TS error on older type defs
    scopes: ['openid', 'email', 'profile'],
  });

  // Handle Google result
  useEffect(() => {
    (async () => {
      if (gResponse?.type !== 'success') return;
      const idToken = (gResponse as any)?.params?.id_token;
      if (!idToken) {
        Alert.alert('Google Login Failed', 'No ID token returned.');
        return;
      }
      await handleGoogleLogin(idToken);
    })();
  }, [gResponse]);

  const handleGoogleLogin = async (idToken: string) => {
    try {
      const res = await fetch(`${API}/login/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      });
      const data = await res.json();

      if (res.ok && data?.access_token) {
        await SecureStore.setItemAsync('auth_token', data.access_token);
        const userRes = await fetch(`${API}/me`, {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        const userInfo = await userRes.json();
        setUser({ ...userInfo, token: data.access_token }); // fixed spread
        router.replace('/chat');
      } else {
        Alert.alert('Google Login Failed', data?.detail || 'Server rejected the token.');
      }
    } catch (err) {
      console.error('Google login error:', err);
      Alert.alert('Login Failed', 'Network/server error.');
    }
  };

  // ---------- Apple Sign-in (native iOS) ----------
  const handleAppleLogin = async () => {
    try {
      if (!AppleAuth) {
        Alert.alert('Apple Sign-in unavailable', 'Install expo-apple-authentication and rebuild the iOS app.');
        return;
      }
      const cred = await AppleAuth.signInAsync({
        requestedScopes: [
          AppleAuth.AppleAuthenticationScope.EMAIL,
          AppleAuth.AppleAuthenticationScope.FULL_NAME,
        ],
      });

      const idToken = cred.identityToken;
      const firstTimeEmail = (cred as any).email ?? null;             // only on first auth
      const givenName      = cred.fullName?.givenName ?? null;
      const familyName     = cred.fullName?.familyName ?? null;

      const res = await fetch(`${API}/login/apple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_token: idToken,
          email_hint: firstTimeEmail,      // NEW
          given_name: givenName,           // NEW
          family_name: familyName,         // NEW
        }),
      });
      const data = await res.json();
      if (res.ok && data?.access_token) {
        await SecureStore.setItemAsync('auth_token', data.access_token);
        const me = await fetch(`${API}/me`, {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        const info = await me.json();
        setUser({ ...info, token: data.access_token });
        router.replace('/chat');
      } else {
        Alert.alert('Apple Login Failed', data?.detail || 'Server rejected the token.');
      }
    } catch (e: any) {
      if (e?.code === 'ERR_CANCELED') return;
      console.error('Apple login error:', e);
      Alert.alert('Apple Login Failed', e?.message || 'Unexpected error.');
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
        onPress={() => {
          setUser(guestUser);
          router.replace('/chat');
        }}
      >
        <Text style={styles.skipText}>SKIP &gt;</Text>
      </TouchableOpacity>

      <Image source={require('@/assets/icons/login-logo.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>HYPEWAVE</Text>
      <Text style={styles.subtitle}>Your personal trading assistant</Text>

      {/* Google */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        style={[
          styles.oauthBtn,
          (!gRequest || !clientId) && styles.btnDisabled,
        ]}
        onPress={() => gPrompt()}
        disabled={!gRequest || !clientId}
        activeOpacity={0.8}
      >
        <Image
          source={require('@/assets/icons/google.png')}
          style={styles.oauthIcon}
          resizeMode="contain"
        />
        <Text style={styles.oauthTextDark}>Continue with Google</Text>
      </TouchableOpacity>

      {/* Apple (native iOS) */}
      {Platform.OS === 'ios' && AppleAuth && (
        <View style={{ width: '100%', marginBottom: 16 }}>
          <AppleAuth.AppleAuthenticationButton
            buttonType={AppleAuth.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuth.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={10}
            style={{ width: '100%', height: 44 }}
            onPress={handleAppleLogin}
          />
        </View>
      )}

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
        autoCapitalize="none"
        keyboardType="email-address"
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
  logo: { width: 160, height: 160, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  subtitle: { fontSize: 16, color: 'white', marginBottom: 40 },
  googleBtn: { backgroundColor: '#0D1A43', paddingVertical: 20, paddingHorizontal: 24, borderRadius: 10, marginBottom: 12, width: '100%', alignItems: 'center' },
  googleText: { color: 'white', fontWeight: '600', },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  line: { flex: 1, height: 1, backgroundColor: 'white' },
  or: { marginHorizontal: 8, padding: 10, color: 'white' },
  input: { width: '100%', height: 48, backgroundColor: '#eaf1ffff', borderRadius: 8, paddingHorizontal: 12, marginBottom: 12 },
  loginBtn: { backgroundColor: '#0D1A43', paddingVertical: 14, borderRadius: 10, marginTop: 10, width: '100%', alignItems: 'center' },
  loginText: { color: 'white', fontWeight: '600' },
  legal: { fontSize: 12, color: 'white', textAlign: 'center', marginTop: 30, paddingHorizontal: 10 },
  link: { textDecorationLine: 'underline' },
  signupLink: { color: 'white', fontSize: 13, marginTop: 18, textAlign: 'center' },
  signupLinkBold: { textDecorationLine: 'underline', fontWeight: '600' },
  oauthBtn: {
  width: '100%',
  height: 44,
  borderRadius: 10,
  backgroundColor: '#fff',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'row',
  marginBottom: 12,
},
oauthIcon: {
  width: 18,
  height: 18,
  marginRight: 8,
},
oauthTextDark: {
  color: '#000',
  fontWeight: '600',
  fontSize: 16,
},
btnDisabled: {
  opacity: 0.5,
},
});
