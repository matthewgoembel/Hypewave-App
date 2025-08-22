// app/help-center.tsx
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ⬇️ Replace these with your real URLs
const PRIVACY_URL = 'https://your-site.com/privacy';
const TERMS_URL   = 'https://your-site.com/terms';
const RISK_URL    = 'https://your-site.com/risk';

const SUPPORT_EMAIL = 'support@hypewave.ai';
const DISCORD_URL   = 'https://discord.gg/4Se7DnvY';
const TELEGRAM_URL  = 'https://t.me/hypewaveai';
const STATUS_URL    = 'https://status.your-site.com';
const BILLING_URL   = 'https://your-site.com/billing';

export default function HelpCenterScreen() {
  const router = useRouter();

  const open = (url: string) => Linking.openURL(url);
  const email = (addr: string) => Linking.openURL(`mailto:${addr}`);

  return (
    <View style={styles.container}>
      {/* Back button (matches AccountScreen positioning) */}
      <TouchableOpacity
        onPress={() => router.back()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={{
          position: 'absolute',
          top: 72,
          left: 24,
          backgroundColor: '#00163a',
          borderRadius: 20,
          padding: 8,
          zIndex: 50,
          elevation: 8,
        }}
      >
        <Ionicons name="arrow-back" size={20} color="white" />
      </TouchableOpacity>

      <Text style={styles.title}>Help Center</Text>

      {/* LEGAL */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Legal</Text>

        <Row
          label="Privacy Policy"
          onPress={() => open(PRIVACY_URL)}
        />
        <Row
          label="Terms of Service"
          onPress={() => open(TERMS_URL)}
        />
        <Row
          label="Risk Disclosure"
          onPress={() => open(RISK_URL)}
          isLast
        />
      </View>

      {/* SUPPORT */}
      <View style={[styles.card, { marginTop: 18 }]}>
        <Text style={styles.sectionHeader}>Support</Text>

        <Row
          label="Email Support"
          value="Email us"
          valueTint="#3ABEFF"
          onPress={() => email(SUPPORT_EMAIL)}
        />
        <Row
          label="Discord"
          onPress={() => open(DISCORD_URL)}
        />
        <Row
          label="Telegram"
          onPress={() => open(TELEGRAM_URL)}
        />
        <Row
          label="System Status"
          onPress={() => open(STATUS_URL)}
        />
        <Row
          label="Billing & Subscriptions"
          onPress={() => open(BILLING_URL)}
          isLast
        />
      </View>

      {/* Footer (same vibe as AccountScreen) */}
      <View style={styles.footer}>
        <Image
          source={require('@/assets/icons/assistant.png')}
          style={{ width: 72, height: 72, marginBottom: 10 }}
        />
        <Text style={{ color: '#ccc', fontSize: 16 }}>Hypewave AI</Text>
        <Text style={{ color: '#444', fontSize: 10 }}>
          © {new Date().getFullYear()} Hypewave AI • Updated {new Date().toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
}

function Row({
  label,
  value = '>',
  valueTint = '#ffffffcc',
  isLast = false,
  onPress,
}: {
  label: string;
  value?: string;
  valueTint?: string;
  isLast?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, isLast && { borderBottomWidth: 0 }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: valueTint }]}>{value}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#00163a',
    flex: 1,
    paddingTop: 78,
    paddingHorizontal: 24,
  },
  title: {
    color: 'white',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 30,
  },
  card: {
    backgroundColor: '#0b214e',
    borderRadius: 16,
    padding: 12,
    borderColor: '#3ABEFF',
    borderWidth: 1,
  },
  sectionHeader: {
    color: '#ffffffcc',
    fontSize: 12,
    marginBottom: 2,
    paddingHorizontal: 8,
    paddingTop: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomColor: '#1e2a47',
    borderBottomWidth: 1,
  },
  label: {
    color: 'white',
    fontSize: 14,
  },
  value: {
    color: '#ffffffcc',
    fontSize: 14,
  },
  footer: {
    marginTop: 50,
    alignItems: 'center',
  },
});
