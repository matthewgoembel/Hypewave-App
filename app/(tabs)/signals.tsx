// app/(tabs)/signals.tsx
import PageLayout from "@/components/ui/PageLayout";
import ScrollToTopPill from "@/components/ui/ScrollToTopPill";
import SideMenu from "@/components/ui/SideMenu";
import SignalCard from "@/components/ui/SignalCard";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const API_BASE_URL = "https://hypewave-ai-engine.onrender.com";

type SignalType = {
  signal_id: string;
  created_at: string;
  input: { symbol: string };
  output: {
    trade: string;
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

type WinrateDoc = {
  wins: number;
  total_trades: number;
  winrate: number; // percent
  last_updated?: string;
};

export default function SignalsScreen() {
  const [signals, setSignals] = useState<SignalType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  // scroll-to-top visibility
  const [showLatest, setShowLatest] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  /** ---------- Filter + stats ---------- */
  const [filterOpen, setFilterOpen] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState<WinrateDoc | null>(null);

  const fetchSignals = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/signals/latest`);
      const data = await res.json();
      setSignals(data.latest_signals || []);
      setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } catch (err) {
      console.error("Failed to fetch signals:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Try /stats/winrate; render pill even if it fails
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/signals/winrate`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json = await res.json();
      setStats({
        wins: json.wins ?? 0,
        total_trades: json.total_trades ?? 0,
        winrate: json.winrate ?? 0,
        last_updated: json.last_updated,
      });
    } catch (e) {
      // keep pill visible even if request fails
      setStats((prev) => prev ?? { wins: 0, total_trades: 0, winrate: 0 });
    }
  };

  useEffect(() => {
    fetchSignals();
    fetchStats();
    const id = setInterval(fetchSignals, 20000);
    return () => clearInterval(id);
  }, []);

  const onScroll = (e: any) => {
    const y = e.nativeEvent.contentOffset?.y ?? 0;
    setShowLatest(y > 300);
  };

  // unique symbols from feed
  const symbols = useMemo(() => {
    const set = new Set<string>();
    signals.forEach((s) => s?.input?.symbol && set.add(s.input.symbol.toUpperCase()));
    return Array.from(set);
  }, [signals]);

  // keep “all checked by default”, remove stale keys
  useEffect(() => {
    if (!symbols.length) return;
    setChecked((prev) => {
      const next: Record<string, boolean> = {};
      symbols.forEach((s) => (next[s] = prev[s] ?? true));
      return next;
    });
  }, [symbols]);

  const filteredSignals = useMemo(() => {
    if (!symbols.length) return signals;
    return signals.filter((s) => checked[s.input.symbol.toUpperCase()]);
  }, [signals, symbols, checked]);

  const toggleSymbol = (sym: string) => setChecked((p) => ({ ...p, [sym]: !p[sym] }));

  const WinratePill = () => {
    const pct = stats ? (Math.round((stats.winrate || 0) * 10) / 10).toFixed(1) : "—";
    const wins = stats?.wins ?? 0;
    const total = stats?.total_trades ?? 0;

    return (
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Ionicons name="trophy-outline" size={18} color="#3ABEFF" style={{ marginRight: 4 }} />
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>{pct}%</Text>
          <Text style={{ color: "#ffffff99", fontWeight: "600", fontSize: 10 }}>
            {wins}/{total}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <>
      <PageLayout
        refreshing={refreshing}
        onRefresh={() => {
          fetchSignals();
          fetchStats();
        }}
        lastUpdated={lastUpdated}
        onMenuPress={() => setMenuVisible(true)}
        scrollRef={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        scrollStyle={{ backgroundColor: "#00163a" }}
        contentContainerStyle={{ paddingBottom: 48 }}
        overlayUnderHeader={
          <ScrollToTopPill
            visible={showLatest}
            label="Latest"
            onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
            style={{ alignSelf: "center", marginTop: 8 }}
          />
        }
      >
        {/* ===== Title strip (unchanged flow) ===== */}
        <View style={{ marginTop: 4, marginBottom: 16, position: "relative" }}>
          {/* Absolute row so it DOES NOT push layout */}
          <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              left: 8,
              right: 8,
              top: 0,
              height: 36,
              zIndex: 30,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* Filter icon (left) */}
            <View style={{ position: "relative" }}>
              <TouchableOpacity
                onPress={() => setFilterOpen((v) => !v)}
                activeOpacity={0.8}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: "#0b2a54",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="filter-outline" size={18} color="#3ABEFF" />
              </TouchableOpacity>

              {/* Dropdown (absolute; no layout shift) */}
              {filterOpen && (
                <View
                  style={{
                    position: "absolute",
                    top: 42,
                    left: 0,
                    minWidth: 160,
                    backgroundColor: "#0b1f3f",
                    borderRadius: 10,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: "#1b3a72",
                    zIndex: 50,
                  }}
                >
                  {symbols.length === 0 ? (
                    <View style={{ padding: 12 }}>
                      <Text style={{ color: "#ffffff88" }}>No coins</Text>
                    </View>
                  ) : (
                    symbols.map((sym) => {
                      const isChecked = !!checked[sym];
                      return (
                        <TouchableOpacity
                          key={sym}
                          onPress={() => toggleSymbol(sym)}
                          style={{
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                            backgroundColor: isChecked ? "transparent" : "#132a50",
                          }}
                        >
                          <Ionicons
                            name={isChecked ? "checkbox-outline" : "square-outline"}
                            size={18}
                            color={isChecked ? "#3ABEFF" : "#ffffff99"}
                          />
                          <Text style={{ color: "white", fontWeight: "600" }}>{sym}</Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              )}
            </View>

            {/* Win‑rate pill (right) — always rendered */}
            <WinratePill />
          </View>

          {/* Centered title */}
          <Text
            style={{
              color: "white",
              fontSize: 18,
              fontWeight: "600",
              textAlign: "center",
              marginBottom: 4,
            }}
          >
            Trade Signals
          </Text>

          {lastUpdated && (
            <Text style={{ color: "#ffffff88", fontSize: 12, textAlign: "center", marginBottom: 6 }}>
              Last updated: {lastUpdated}
            </Text>
          )}

          <View style={{ height: 0.5, backgroundColor: "#0ea2c777", marginHorizontal: 8 }} />
        </View>

        {/* ===== Feed ===== */}
        {loading ? (
          <ActivityIndicator size="large" color="#3ABEFF" />
        ) : filteredSignals.length > 0 ? (
          filteredSignals.map((signal) => <SignalCard key={signal.signal_id} signal={signal} />)
        ) : (
          <Text style={{ color: "#ffffff88", textAlign: "center", marginTop: 16 }}>
            No signals found.
          </Text>
        )}
      </PageLayout>

      {menuVisible && <SideMenu onClose={() => setMenuVisible(false)} />}
    </>
  );
}
