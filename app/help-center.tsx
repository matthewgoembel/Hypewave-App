// app/help-center.tsx
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const PRIVACY_URL   = "https://www.hypewaveai.com/privacy";
const TERMS_URL     = "https://www.hypewaveai.com/terms";
const RISK_URL      = "https://www.hypewaveai.com/risk";
const SUPPORT_EMAIL = "support@hypewaveai.com";
const SUPPORT_URL   = "https://www.hypewaveai.com/support";
const DISCORD_URL   = "https://discord.gg/7HkPdRVS";
const TELEGRAM_URL  = "https://t.me/hypewaveai";
const STATUS_URL    = "https://status.hypewaveai.com";
const BILLING_URL   = "https://www.hypewaveai.com/pricing";
const DEVELOPER_EMAIL="developer@hypewaveai.com";

export default function HelpCenterScreen() {
  const router = useRouter();
  const open  = (url: string) => Linking.openURL(url);
  const email = (addr: string) => Linking.openURL(`mailto:${addr}`);

  return (
    <SafeAreaView style={styles.container}>
      {/* Match Account header (back button + centered title) */}
      <TouchableOpacity
        onPress={() => router.back()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={styles.backBtn}
      >
        <Ionicons name="arrow-back" size={20} color="white" />
      </TouchableOpacity>

      <Text style={styles.title}>Help Center</Text>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Legal */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Legal</Text>
          <Row label="Privacy Policy" onPress={() => open(PRIVACY_URL)} />
          <Row label="Terms of Service" onPress={() => open(TERMS_URL)} />
          <Row label="Risk Disclosure" onPress={() => open(RISK_URL)} isLast />
        </View>

        {/* Support */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Support</Text>
          <Row
            label="Email Support"
            value="Email us"
            valueTint="#3ABEFF"
            onPress={() => email(SUPPORT_EMAIL)}
          />
          <Row
            label="Email Developer"
            value="Email us"
            valueTint="#3ABEFF"
            onPress={() => email(DEVELOPER_EMAIL)}
          />
          <Row label="Help" onPress={() => open(BILLING_URL)} />
          <Row label="Billing & Subscriptions" onPress={() => open(BILLING_URL)} />
          <Row label="Discord" onPress={() => open(DISCORD_URL)} />
          <Row label="Telegram" onPress={() => open(TELEGRAM_URL)} />
        </View>

        {/* Footer (match Account) */}
        <View style={styles.footer}>
          <Image
            source={require('@/assets/icons/assistant.png')}
            style={{ width: 160, height: 160, marginBottom: -20 }}
          />
          <Text style={{ color: '#ccc', fontSize: 20, marginBottom: 10 }}>Hypewave AI</Text>
          <Text style={{ color: '#444', fontSize: 10 }}>
            © {new Date().getFullYear()} Hypewave AI • Updated {new Date().toLocaleDateString()}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  backBtn: {
    position: 'absolute',
    top: 72,
    left: 24,
    backgroundColor: '#00163a',
    borderRadius: 20,
    padding: 8,
    zIndex: 50,
    elevation: 8,
  },
  title: {
    color: 'white',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 30,
    marginTop: 16,
  },
  scroll: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#0b214e',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 2,
    marginHorizontal: 20,
    borderColor: '#3ABEFF',
    borderWidth: 1,
    marginBottom: 18,
  },
  sectionHeader: {
    color: '#ffffffcc',
    fontSize: 12,
    marginBottom: 2,
    paddingHorizontal: 8,
    paddingTop: 2,
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
  label: { color: 'white', fontSize: 14 },
  value: { color: '#ffffffcc', fontSize: 14 },
  footer: {
    marginTop: 60,
    alignItems: 'center',
  },
});
