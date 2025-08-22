// app/help-center.tsx
import MainHeader from "@/components/ui/MainHeader";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React from "react";
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// TODO: paste your real links here
const PRIVACY_URL = "https://www.hypewaveai.com/privacy";
const TERMS_URL = "https://www.hypewaveai.com/terms";
const RISK_URL = "https://www.hypewaveai.com/risk";
// Contact options
const SUPPORT_EMAIL = "support@hypewaveai.com";
const DISCORD_URL = "https://discord.gg/7HkPdRVS";
const TELEGRAM_URL = "https://t.me/hypewaveai";

export default function HelpCenterScreen() {
  const router = useRouter();

  const open = (url: string) => Linking.openURL(url);
  const email = (addr: string) => Linking.openURL(`mailto:${addr}`);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0b214e" }}>
      {/* Reuse your global header so spacing matches other screens */}
      <MainHeader
        title="Help Center"
        showBack
        onBackPress={() => router.back()}
        // If your MainHeader expects different props, adjust accordingly
      />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.subtitle}>
          Everything legal & support in one place.
        </Text>

        {/* Legal */}
        <Text style={styles.sectionTitle}>Legal</Text>
        <View style={styles.cardRow}>
          <HelpCard
            title="Privacy Policy"
            desc="How we collect, use, and protect your data."
            onPress={() => open(PRIVACY_URL)}
          />
          <HelpCard
            title="Terms of Service"
            desc="Your rights and responsibilities using Hypewave."
            onPress={() => open(TERMS_URL)}
          />
          <HelpCard
            title="Risk Disclosure"
            desc="Important info on market risk & limitations."
            onPress={() => open(RISK_URL)}
          />
        </View>

        {/* Contact / Support */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Support</Text>
        <View style={styles.cardRow}>
          <HelpCard
            title="Email Support"
            desc="Get help from our team."
            onPress={() => email(SUPPORT_EMAIL)}
            cta="Email us"
          />
          <HelpCard
            title="Discord"
            desc="Join the community & get help."
            onPress={() => open(DISCORD_URL)}
          />
          <HelpCard
            title="Telegram"
            desc="Real-time updates & support."
            onPress={() => open(TELEGRAM_URL)}
          />
        </View>

        <Text style={styles.footerNote}>
          © {new Date().getFullYear()} Hypewave AI • Last updated{" "}
          {new Date().toLocaleDateString()}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function HelpCard({
  title,
  desc,
  cta = "Open",
  onPress,
}: {
  title: string;
  desc: string;
  cta?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.cardAccent} />
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDesc}>{desc}</Text>
      <View style={styles.cardBtn}>
        <Text style={styles.cardBtnText}>{cta}</Text>
        <Text style={styles.cardBtnArrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  subtitle: {
    color: "#cfe8ff",
    fontSize: 13,
    marginBottom: 10,
  },
  sectionTitle: {
    color: "#ffffffcc",
    fontSize: 14,
    marginBottom: 8,
  },
  cardRow: {
    gap: 12,
  },
  card: {
    backgroundColor: "#102a5a",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e2a47",
  },
  cardAccent: {
    position: "absolute",
    right: -40,
    top: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(58,190,255,0.18)", // #3ABEFF glow
  },
  cardTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardDesc: {
    color: "#d6e6ff",
    fontSize: 13,
    marginBottom: 10,
  },
  cardBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#3ABEFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  cardBtnText: {
    color: "#00121d",
    fontWeight: "700",
    fontSize: 13,
  },
  cardBtnArrow: {
    color: "#00121d",
    fontWeight: "900",
    fontSize: 16,
    marginLeft: 6,
    marginTop: -1,
  },
  footerNote: {
    color: "#8fb6ff",
    fontSize: 11,
    marginTop: 18,
    textAlign: "center",
    opacity: 0.9,
  },
});
