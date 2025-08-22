// === FILE: /components/ui/SignalCard.tsx ===
import { UserContext } from "@/components/UserContext";
import axios from "axios";
import { useContext, useState } from "react";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const API_BASE_URL = "https://hypewave-ai-engine.onrender.com";

// 🔁 Update these paths if your icons live elsewhere
import downvote from "@/assets/icons/downvote.png";
import downvote_selected from "@/assets/icons/downvote_selected.png";
import upvote from "@/assets/icons/upvote.png";
import upvote_selected from "@/assets/icons/upvote_selected.png";

type Signal = {
  signal_id: string;
  created_at: string;
  input: { symbol: string };
  output: {
    trade: string;  // "LONG" | "SHORT"
    entry: number;
    tp: number;
    sl: number;
    confidence: number;
    thesis: string;
  };
  feedback?: { up: number; down: number };
  status?: "open" | "closed" | "OPEN";
  outcome?: "win" | "loss" | null;
  closed_reason?: "tp" | "sl" | null;
};

type Props = { signal: Signal };

export default function SignalCard({ signal }: Props) {
  const { user } = useContext(UserContext) as any;
  const token: string | undefined = user?.token;

  const {
    input: { symbol },
    output: { trade, entry, tp, sl, confidence, thesis },
    signal_id,
    created_at,
    feedback,
    status,
    outcome,
    closed_reason,
  } = signal;

  // local vote state
  const [up, setUp] = useState<number>(feedback?.up ?? 0);
  const [down, setDown] = useState<number>(feedback?.down ?? 0);
  const [myVote, setMyVote] = useState<1 | -1 | 0>(0);
  const [busy, setBusy] = useState(false);

  const isLong = trade === "LONG";
  const normalizedStatus = (status || "open").toLowerCase();

  const borderColor =
    normalizedStatus === "open"
      ? (isLong ? "#27e49c" : "#ff6262")
      : outcome === "win"
      ? "#1f9d55"
      : "#d64545";

  const castVote = async (vote: 1 | -1) => {
    if (!token) {
      Alert.alert("Login required", "Sign in to vote on signals.");
      return;
    }
    if (busy) return;
    setBusy(true);

    // optimistic
    const prev = { up, down, myVote };
    if (myVote === vote) {
      // no-op
    } else if (myVote === 0) {
      if (vote === 1) setUp((v) => v + 1);
      else setDown((v) => v + 1);
      setMyVote(vote);
    } else {
      if (myVote === 1 && vote === -1) { setUp((v) => v - 1); setDown((v) => v + 1); }
      if (myVote === -1 && vote === 1) { setDown((v) => v - 1); setUp((v) => v + 1); }
      setMyVote(vote);
    }

    try {
      // Backend expects {"vote": 1} with embed=True OR raw 1; we send the object.
      const res = await axios.post(
        `${API_BASE_URL}/signals/${signal_id}/vote`,
        { vote },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const fb = res.data?.feedback ?? { up: 0, down: 0 };
      setUp(fb.up); setDown(fb.down);
    } catch (e) {
      console.error("Voting failed:", e);
      // revert
      setUp(prev.up); setDown(prev.down); setMyVote(prev.myVote);
    } finally {
      setBusy(false);
    }
  };

  const closedBadge =
    normalizedStatus === "closed"
      ? (outcome === "win" ? "WIN (TP)" : "LOSS (SL)")
      : "OPEN";

  return (
    <View style={[styles.card, { borderLeftColor: borderColor }]}>
      <View style={styles.headerRow}>
        <Text style={styles.symbol}>{`$${symbol} — ${trade}`}</Text>
        <Text style={styles.timestamp}>
          {new Date(created_at).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          })}
        </Text>

      </View>

      <Text style={styles.priceLine}>Entry: {entry} | TP: {tp} | SL: {sl}</Text>
      <Text style={styles.confidence}>Confidence: {confidence}%</Text>
      <Text style={styles.thesis}>{thesis}</Text>

      <View style={styles.metaRow}>
        <View style={[
          styles.badge,
          normalizedStatus === "open" ? styles.badgeOpen : (outcome === "win" ? styles.badgeWin : styles.badgeLoss)
        ]}>
          <Text style={styles.badgeText}>
            {normalizedStatus === "open" ? "OPEN" : (closed_reason ? closedBadge : (outcome || "").toUpperCase())}
          </Text>
        </View>
      </View>

      {/* ✅ Bottom-left vote bar */}
      <View style={styles.voteBar}>
        <TouchableOpacity
          disabled={busy}
          onPress={() => castVote(1)}
          style={styles.voteRow}
        >
          <Image
            source={myVote === 1 ? upvote_selected : upvote}
            style={styles.voteIcon}
            resizeMode="contain"
          />
          <Text style={styles.voteCount}>{up}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          disabled={busy}
          onPress={() => castVote(-1)}
          style={styles.voteRow}
        >
          <Image
            source={myVote === -1 ? downvote_selected : downvote}
            style={styles.voteIcon}
            resizeMode="contain"
          />
          <Text style={styles.voteCount}>{down}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#081431ff",
    padding: 14,
    paddingBottom: 56, 
    borderRadius: 16,
    marginBottom: 16,
    borderLeftWidth: 5,
    position: "relative",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  symbol: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  timestamp: {
    color: "white",
    fontSize: 12,
    opacity: 0.6,
  },
  priceLine: {
    color: "white",
    marginTop: 4,
    fontSize: 14,
  },
  confidence: {
    color: "white",
    fontSize: 13,
    opacity: 0.7,
    marginTop: 6,
  },
  thesis: {
    color: "white",
    fontSize: 13,
    opacity: 0.9,
    marginTop: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  badgeOpen: { backgroundColor: "#2c3e5a" },
  badgeWin: { backgroundColor: "#1f9d55" },
  badgeLoss: { backgroundColor: "#d64545" },
  badgeText: { color: "white", fontSize: 12, fontWeight: "600" },

  // ✅ vote bar pinned bottom-left
  voteBar: {
    position: "absolute",
    left: 12,
    bottom: 12,
    gap: 12,
    flexDirection: "row",   // 🔹 arrange side-by-side
  },
  voteRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  voteIcon: {
    width: 22,
    height: 22,
  },
  voteCount: {
    marginLeft: 6,
    color: "#ffffffcc",
    fontSize: 13,
    fontWeight: "600",
  },
});
