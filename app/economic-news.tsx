// app/economic-news.tsx
export const screenOptions = { headerShown: false };

import MainHeader from '@/components/ui/MainHeader';
import SideMenu from '@/components/ui/SideMenu'; // ← NEW
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

import flameIcon from '@/assets/icons/impact_flame.png';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const API_URL = 'https://hypewave-ai-engine.onrender.com/economic-calendar';
const ANALYZE_API_URL = 'https://hypewave-ai-engine.onrender.com/analyze-economic';

type EconomicEvent = {
  time: string;
  title: string;
  period: string;
  actual: string;
  forecast: string;
  previous: string;
  // optional in future: impact?: 0|1|2|3
};

type DayGroup = { date_label: string; events: EconomicEvent[] };
type WeekSection = { section: string; events: DayGroup[] };

// ---------- Helpers ----------
const normalizeWeekKey = (s: string) =>
  (s || '')
    .replace(/[\p{Emoji_Presentation}\p{Emoji}\uFE0F]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const UI_WEEK = {
  LAST: '📆 Last Week',
  THIS: '📆 This Week',
  NEXT: '🔮 Next Week',
} as const;

const keyOf = (uiLabel: string) => {
  const k = normalizeWeekKey(uiLabel);
  if (k.includes('last')) return 'last';
  if (k.includes('next')) return 'next';
  return 'this';
};

// Matches: "MONDAY, AUG. 11" / "TUESDAY, AUG. 12" etc. (in the time column)
const DATE_HEADER_RE = /^[A-Z]+DAY,\s+[A-Z]+\.?\s+\d{1,2}$/;

// Strong scrubber for any hidden breaks & HTML <br>
const formatDateLabel = (raw: string): string =>
  (raw || '')
    .replace(/\*\*/g, '')
    .replace(/\u2028|\u2029|\u000B|\u000C/g, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/[\n\r]/g, ' ')
    .replace(/\s+/g, ' ')
    .normalize('NFKC')
    .trim()
    .toUpperCase();

// Split an "Unlabeled" day whose header is embedded in events' time column
function splitByHeaderEvents(events: EconomicEvent[]): DayGroup[] {
  const out: DayGroup[] = [];
  let current: DayGroup | null = null;

  for (const ev of events) {
    const timeText = (ev.time || '').trim();
    const titleText = (ev.title || '').trim();

    // Day header lives in time column, title is empty
    if (!titleText && DATE_HEADER_RE.test(timeText)) {
      if (current && current.events.length > 0) out.push(current);
      current = { date_label: timeText, events: [] };
      continue;
    }
    if (!current) current = { date_label: 'UNLABELED', events: [] };
    current.events.push(ev);
  }

  if (current && current.events.length > 0) out.push(current);
  return out.filter((d) => d.events.length > 0);
}

/** ---------- Impact logic (more accurate) ---------- */
// High-impact patterns (includes all UoM/UMich Consumer Sentiment variants)
const HIGH_IMPACT = [
  // Prices & growth
  /\bppi\b|\bproducer price/i,
  /\bretail sales\b/i,
  /(^|\s)core?\s*cpi\b/i,
  /(^|\s)pce\b/i,
  /(^|\s)core?\s*pce\b/i,
  /\bgdp\b(?!\s*price)/i,
  /\bcpi\b(?!.*\bpreview\b)/i,

  // Labor & policy
  /\bnonfarm\b|\bnfp\b|\bpayrolls?\b/i,
  /\bunemployment rate\b/i,
  /\bfomc\b|\brate (decision|announcement)\b|\binterest[- ]?rate\b/i,

  // University of Michigan / UMich / UoM Consumer Sentiment variants
  /\b(prelim(?:inary)?\s*)?(?:u\.?\s*of\s*m|u\.?\s*mich|umich|uom|u\.?\s*michigan|u\s*michigan|university of michigan|michigan)\b.*\b(index of\s+)?consumer\s*sentiment\b/i,
  /\b(index of\s+)?consumer\s*sentiment\b.*\b(prelim(?:inary)?)\b/i
];

const MED_IMPACT = [
  // Manufacturing / activity
  /\bism\b|\bpmi\b|\bmanufacturing index\b/i,
  // Labor detail
  /\bjolts\b|\bjob openings\b/i,
  // Housing
  /\bhousing starts\b|\bbuilding permits\b/i,
  /\bexisting home sales\b|\bnew home sales\b/i,
  // Confidence (NOT UoM sentiment; that's high now)
  /\bconsumer confidence\b/i
];

const LOW_IMPACT = [
  /\bfactory orders\b/i,
  /\bwholesale inventories?\b/i,
  /\bmortgage applications?\b/i,
  /\bfederal budget\b/i,
  /\b(?:president|chair|governor).*\b(speaks|speech)\b/i
];

function computeImpactFromTitle(title: string): 0|1|2|3 {
  const t = title || '';
  if (HIGH_IMPACT.some(rx => rx.test(t))) return 3;
  if (MED_IMPACT.some(rx => rx.test(t)))  return 2;
  if (LOW_IMPACT.some(rx => rx.test(t)))  return 1;
  return 0;
}

function renderImpact(e: { title: string; impact?: number }) {
  const level = Math.max(0, Math.min(e.impact ?? computeImpactFromTitle(e.title), 3));
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
      {Array.from({ length: level }).map((_, i) => (
        <Image key={i} source={flameIcon} style={{ width: 20, height: 20, marginLeft: 2 }} resizeMode="contain" />
      ))}
    </View>
  );
}

/** ---------- AI Insights integration ---------- */
type AIState = Record<string, { text?: string; loading?: boolean; error?: string }>;

function composePrompt(e: EconomicEvent, dateLabel: string) {
  return [
    `Explain this economic release with trading context in mind:`,
    `• Release: ${e.title || 'N/A'}`,
    `• Date: ${dateLabel}`,
    `• Time: ${e.time || 'N/A'}`,
    e.period ? `• Period: ${e.period}` : null,
    e.forecast ? `• Forecast: ${e.forecast}` : null,
    e.previous ? `• Previous: ${e.previous}` : null,
    e.actual ? `• Actual: ${e.actual}` : null,
    ``,
    `Answer with SHORT bullets:`,
    `• How are the markests likley to react (S&P/NASDAQ, Crypto, USD, equities, gold/oil, rates).`,
    `• Over vs under forecast: likely immediate reactions.`,
    `• Key details to watch (core vs headline, revisions).`,
    `• (Optional) brief historical context.`,
  ]
    .filter(Boolean)
    .join('\n');
}

export default function EconomicNewsScreen() {
  const router = useRouter();
  const [rawData, setRawData] = useState<Array<WeekSection> | DayGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeWeek, setActiveWeek] = useState<string>(UI_WEEK.THIS);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [ai, setAi] = useState<AIState>({});
  const [menuOpen, setMenuOpen] = useState(false); // ← already in your snippet

  const toggleRow = (date: string, idx: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const key = `${date}-${idx}`;
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  async function generateAnalysis(key: string, e: EconomicEvent, dateLabel: string) {
    const prompt = composePrompt(e, formatDateLabel(dateLabel));
    setAi((prev) => ({ ...prev, [key]: { ...prev[key], loading: true, error: undefined } }));
    try {
      const res = await fetch(ANALYZE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: e.title,
          date: formatDateLabel(dateLabel),
          time: e.time,
          period: e.period,
          forecast: e.forecast,
          previous: e.previous,
          actual: e.actual,
          prompt, // send both, backend will accept either
        }),
      });
      const json = await res.json();
      const text = (json?.analysis || json?.text || '').toString().trim();
      if (!text) throw new Error(json?.error || 'No analysis returned');
      setAi((prev) => ({ ...prev, [key]: { text, loading: false } }));
    } catch (err: any) {
      setAi((prev) => ({ ...prev, [key]: { loading: false, error: err?.message || 'Failed to fetch analysis.' } }));
    }
  }

  function openChatWithPrompt(e: EconomicEvent, dateLabel: string) {
    const prompt = composePrompt(e, formatDateLabel(dateLabel));
    // adjust this route/param to your app's chat screen
    router.push({ pathname: '/chat', params: { prefill: prompt } });
  }

  // ✅ Always fetch the current doc (offset=0). It already includes This/Next/Last.
  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}?offset=0`)
      .then((res) => res.json())
      .then((json) => {
        const cal = json?.calendar;
        setRawData(Array.isArray(cal) ? cal : []);
      })
      .catch(() => setRawData([]))
      .finally(() => setLoading(false));
  }, []); // ← fetch once; switching tabs does NOT refetch

  // ---------- Normalize to real DayGroups with true date_label ----------
  const days: DayGroup[] = useMemo(() => {
    if (!Array.isArray(rawData) || rawData.length === 0) return [];

    let baseDays: DayGroup[] = [];

    // Backend returns WeekSection[] (This/Next/Last) → choose by tab
    if (!('date_label' in (rawData[0] as any))) {
      const sections = rawData as WeekSection[];
      const wantKey = keyOf(activeWeek); // 'this' | 'next' | 'last'

      const sec =
        sections.find((s) => {
          const k = normalizeWeekKey(s.section);
          return (wantKey === 'last' && k.includes('last')) ||
                 (wantKey === 'next' && k.includes('next')) ||
                 (wantKey === 'this' && (k.includes('this') || (!k.includes('last') && !k.includes('next'))));
        }) || (sections.length === 1 ? sections[0] : undefined);

      baseDays = sec?.events || [];
    } else {
      // (Unlikely path) already DayGroup[]
      baseDays = rawData as DayGroup[];
    }

    // Fix “Unlabeled” days where headers were embedded as events
    const normalized: DayGroup[] = [];
    for (const day of baseDays) {
      const label = (day.date_label || '').toLowerCase();
      if (label !== 'unlabeled') {
        normalized.push(day);
      } else {
        normalized.push(...splitByHeaderEvents(day.events || []));
      }
    }
    return normalized;
  }, [rawData, activeWeek]);

  // Alternating row background helper
  const rowBg = (idx: number) => (idx % 2 === 0 ? '#0A1E3F' : '#0E2856');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#00163a' }}>
      {/* Header with working menu button */}
      <MainHeader
        showBack
        onBackPress={() => router.back()}
        title="Economic Calendar"
        onMenuPress={() => setMenuOpen(true)} // ← NEW
      />

      {/* Week Tabs (switches section locally) */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', paddingVertical: 10 }}>
        {[UI_WEEK.LAST, UI_WEEK.THIS, UI_WEEK.NEXT].map((label) => (
          <TouchableOpacity key={label} onPress={() => setActiveWeek(label)}>
            <Text style={{ color: activeWeek === label ? '#3ABEFF' : 'white', marginHorizontal: 8 }}>
              {label.replace(/^[^\w]*\s?/, '')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Table Headers */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: 22,
          paddingVertical: 10,
          borderTopWidth: 0.5,
          borderBottomWidth: 0.5,
          borderColor: '#3ABEFF66',
        }}
      >
        <Text style={{ color: '#ffffffcc', fontSize: 10, flex: 1 }}>TIME</Text>
        <Text style={{ color: '#ffffffcc', fontSize: 10, flex: 3 }}>REPORT</Text>
        <Text style={{ color: '#ffffffcc', fontSize: 10, flex: 1, textAlign: 'right', marginRight: 8 }}>IMPACT</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 30 }} size="large" color="#3ABEFF" />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 80 }}>
          {days.length === 0 ? (
            <Text style={{ color: '#ffffff88', textAlign: 'center', marginTop: 24 }}>
              No events available for this view.
            </Text>
          ) : (
            days.map((day, dIdx) => {
              const formattedLabel = formatDateLabel(day.date_label);

              return (
                <View key={`${formattedLabel}-${dIdx}`} style={{ marginBottom: 8 }}>
                  {/* SINGLE-LINE, BOLD DAY LABEL */}
                  <View
                    style={{
                      marginTop: dIdx > 0 ? 8 : 8,
                      marginBottom: 8,
                      flexDirection: 'row',
                      minWidth: 0,
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={{
                        color: '#ffffff',
                        fontSize: 14,
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        flexShrink: 1,
                        overflow: 'hidden',
                        maxWidth: '100%',
                        fontFamily: Platform.select({
                          ios: 'System',
                          android: 'sans-serif',
                          default: undefined,
                        }),
                      }}
                    >
                      {formattedLabel}
                    </Text>
                  </View>

                  {day.events.map((e, eIdx) => {
                    const key = `${day.date_label}-${eIdx}`;
                    const isOpen = !!expanded[key];
                    const bg = rowBg(eIdx);

                    return (
                      <View key={key} style={{ marginBottom: 2 }}>
                        <TouchableOpacity
                          onPress={() => toggleRow(day.date_label, eIdx)}
                          activeOpacity={0.85}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: 12,
                            paddingHorizontal: 8,
                            backgroundColor: bg,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ color: '#ffffffdd', fontSize: 13, flex: 1 }}>{e.time}</Text>
                          <Text
                            style={{ color: '#ffffff', fontSize: 13, flex: 3 }}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {e.title}
                          </Text>
                          <View style={{ flex: 1, alignItems: 'flex-end' }}>{renderImpact(e)}</View>
                        </TouchableOpacity>

                        {isOpen && (
                          <View
                            style={{
                              backgroundColor: '#ffffff12',
                              borderRadius: 6,
                              padding: 10,
                              marginTop: 2,
                              gap: 8,
                            }}
                          >
                            {/* Stats */}
                            <View style={{ gap: 2 }}>
                              {!!e.period && <Text style={{ color: '#fff', fontSize: 11 }}>Period: {e.period}</Text>}
                              {!!e.forecast && <Text style={{ color: '#fff', fontSize: 11 }}>Forecast: {e.forecast}</Text>}
                              {!!e.previous && <Text style={{ color: '#fff', fontSize: 11 }}>Previous: {e.previous}</Text>}
                              {!!e.actual && <Text style={{ color: '#fff', fontSize: 11 }}>Actual: {e.actual}</Text>}
                            </View>

                            {/* Divider */}
                            <View style={{ height: 1, backgroundColor: '#FFFFFF22', marginVertical: 2 }} />

                            {/* AI Insights header + actions */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Text style={{ color: '#ffffffcc', fontSize: 12, fontWeight: '600' }}>AI Insights</Text>

                              <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity
                                  onPress={() => generateAnalysis(key, e, day.date_label)}
                                  style={{
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                    borderRadius: 6,
                                    backgroundColor: '#3ABEFF33',
                                  }}
                                >
                                  <Text style={{ color: '#3ABEFF', fontSize: 12 }}>
                                    {ai[key]?.loading ? 'Generating…' : ai[key]?.text ? 'Refresh' : 'Generate'}
                                  </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  onPress={() => openChatWithPrompt(e, day.date_label)}
                                  style={{
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                    borderRadius: 6,
                                    backgroundColor: 'rgba(255,255,255,0.08)',
                                  }}
                                >
                                  <Text style={{ color: '#fff', fontSize: 12 }}>Ask Hypewave</Text>
                                </TouchableOpacity>
                              </View>
                            </View>

                            {/* AI text / error */}
                            {!!ai[key]?.error && (
                              <Text style={{ color: '#ff9b9b', fontSize: 11 }}>
                                {ai[key]?.error}
                              </Text>
                            )}
                            {!!ai[key]?.text && !ai[key]?.loading && (
                              <Text style={{ color: '#ffffff', fontSize: 12, lineHeight: 18 }}>
                                {ai[key]?.text}
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ------- Side Menu Overlay ------- */}
      {menuOpen && (
        <>
          {/* dim background; tap to close */}
          <Pressable
            onPress={() => setMenuOpen(false)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
            }}
          />
          {/* slide-in menu panel */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 0,
              width: '78%',
              maxWidth: 420,
              backgroundColor: '#0b1f3f',
              elevation: 12,
              shadowColor: '#000',
              shadowOpacity: 0.35,
              shadowRadius: 12,
              shadowOffset: { width: -4, height: 0 },
            }}
          >
            {/* If your SideMenu handles its own container, just render it */}
            {/* @ts-ignore to support either prop shape */}
            <SideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} setIsOpen={setMenuOpen} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
