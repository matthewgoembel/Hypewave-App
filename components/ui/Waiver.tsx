// components/ui/waiver.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Linking,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type WaiverProps = {
  visible: boolean;
  onConfirm: () => Promise<void> | void; // called after "Continue"
  onRequestClose?: () => void;           // optional (if you want an X/close)
  termsUrl?: string;
  privacyUrl?: string;
  riskUrl?: string;
};

export default function Waiver({
  visible,
  onConfirm,
  onRequestClose,
  termsUrl = "https://www.hypewaveai.com/terms",
  privacyUrl = "https://www.hypewaveai.com/privacy",
  riskUrl = "https://www.hypewaveai.com/risk",
}: WaiverProps) {
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const open = (url: string) => Linking.openURL(url);

  const handleContinue = async () => {
    try {
      setSubmitting(true);
      await onConfirm();
    } finally {
      setSubmitting(false);
      setChecked(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onRequestClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Optional close button */}
          {onRequestClose ? (
            <TouchableOpacity style={styles.closeBtn} onPress={onRequestClose}>
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          ) : null}

          <Text style={styles.title}>One-time Acknowledgement</Text>

          <Text style={styles.copy}>
            I’ve read and agree to the{" "}
            <Text style={styles.link} onPress={() => open(termsUrl)}>Terms</Text>,{" "}
            <Text style={styles.link} onPress={() => open(privacyUrl)}>Privacy Policy</Text>, and{" "}
            <Text style={styles.link} onPress={() => open(riskUrl)}>Risk Disclosure</Text>.
          </Text>

          <TouchableOpacity
            style={styles.checkboxRow}
            activeOpacity={0.8}
            onPress={() => setChecked((v) => !v)}
          >
            <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
              {checked ? (
                <Ionicons name="checkmark" size={14} color="#00121d" />
              ) : null}
            </View>
            <Text style={styles.checkboxLabel}>I acknowledge the above.</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.cta,
              (!checked || submitting) && { opacity: 0.6 },
            ]}
            disabled={!checked || submitting}
            onPress={handleContinue}
          >
            {submitting ? (
              <ActivityIndicator color="#00121d" />
            ) : (
              <Text style={styles.ctaText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#0b214e",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#3ABEFF",
    padding: 16,
  },
  closeBtn: {
    position: "absolute",
    right: 8,
    top: 8,
    padding: 8,
  },
  title: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  copy: {
    color: "#dbe7ff",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
    textAlign: "left",
  },
  link: { color: "#3ABEFF", fontWeight: "600" },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#3ABEFF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkboxChecked: {
    backgroundColor: "#3ABEFF",
  },
  checkboxLabel: {
    color: "white",
    fontSize: 13,
    flexShrink: 1,
  },
  cta: {
    backgroundColor: "#3ABEFF",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  ctaText: {
    color: "#00121d",
    fontWeight: "700",
    fontSize: 14,
  },
});
