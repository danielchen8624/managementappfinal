import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Platform,
  Animated,
  Easing,
} from "react-native";
import {router} from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
  Timestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "../../../firebaseConfig";
import { useBuilding } from "../../BuildingContext";
import { useTheme } from "../../ThemeContext";

/** -----------------------------------------------------------
 *  Color system (same palette structure as Home)
 *  -----------------------------------------------------------
 */
const Pal = {
  light: {
    bg: "#F6F8FB",
    surface: "#FFFFFF",
    subtle: "#F0F2F6",
    text: "#0F172A",
    textMuted: "#4B5563",
    outline: "#E6EAF0",
    outlineBold: "#D4DAE3",
    primary: "#1F4ED8",
    primaryAlt: "#183EA9",
    success: "#0F9B6E",
    warning: "#B45309",
    danger: "#DC2626",
    accent: "#0EA5E9",
  },
  dark: {
    bg: "#0A0F1A",
    surface: "#101826",
    subtle: "#0F172A",
    text: "#E5E7EB",
    textMuted: "#9CA3AF",
    outline: "#1E293B",
    outlineBold: "#334155",
    primary: "#2563EB",
    primaryAlt: "#1E3A8A",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#F87171",
    accent: "#38BDF8",
  },
};

/** ----------------------------
 * Types (flexible + safe)
 * ---------------------------*/
type Actor = {
  id?: string;
  displayName?: string | null;
  name?: string | null;
  role?: string | null;
} | null;
type Target = {
  kind?: "task" | "report" | "scheduler_item" | "security_run" | "other";
  id?: string | null;
} | null;

export type ActivityRow = {
  id: string;
  ts?: Timestamp | null;
  type?:
    | "task_created"
    | "task_completed"
    | "task_assigned"
    | "task_deleted"
    | "report_created"
    | "report_updated"
    | "scheduler_item_created"
    | "scheduler_item_updated"
    | "security_check_submitted"
    | "note"
    | string;
  actor?: Actor;
  target?: Target;
  message?: string | null;
  summary?: string | null;       // 👈 NEW: show this for scheduler events
  meta?: Record<string, any> | null;
};

function ActivityLog() {
  const { buildingId } = useBuilding();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const s = getStyles(isDark);
  const C = isDark ? Pal.dark : Pal.light;

  const [items, setItems] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Theme crossfade (matching Home)
  const themeAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(themeAnim, {
      toValue: isDark ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [isDark, themeAnim]);

  // Subscribe to activity (read-only)
  useEffect(() => {
    let unsub: Unsubscribe | null = null;
    setLoading(true);
    setItems([]);

    if (!buildingId) {
      setLoading(false);
      return;
    }

    const colRef = collection(db, "buildings", buildingId, "activity");
    const qy = query(colRef, orderBy("ts", "desc"), limit(100));

    unsub = onSnapshot(
      qy,
      (snap) => {
        const next: ActivityRow[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            ts: data.ts ?? null,
            type: data.type ?? "note",
            actor: data.actor ?? null,
            target: data.target ?? null,
            message: data.message ?? null,
            summary: data.summary ?? null,   // 👈 pick up summary
            meta: data.meta ?? null,
            name: data.name ?? null, 
          };
        });
        setItems(next);
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        console.error("activityLog onSnapshot error:", err);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return () => {
      if (unsub) unsub();
    };
  }, [buildingId]);

  const onRefresh = useCallback(() => {
    // `onSnapshot` keeps it live; refresh just flips spinner briefly.
    if (refreshing) return;
    setRefreshing(true);
    // minimal debounce to show UI feedback
    setTimeout(() => setRefreshing(false), 400);
  }, [refreshing]);

  const titleFor = (row: ActivityRow) => {
    const t = row.type || "note";
    const target = row.target?.kind ? ` • ${prettyKind(row.target.kind)}` : "";

    // 👇 Prefer summary for scheduler events; fallback label if missing
    const isScheduler =
      t.startsWith("scheduler_item") || t.startsWith("schedule_");
    if (isScheduler) {
      const label = (row.summary ?? "").trim();
      return label || "Schedule item added";
    }

    switch (t) {
      case "task_created":
        return `Task created${target}`;
      case "task_completed":
        return `Task completed${target}`;
      case "task_assigned":
        return `Task assigned${target}`;
      case "task_deleted":
        return `Task deleted${target}`;
      case "report_created":
        return `Report created${target}`;
      case "report_updated":
        return `Report updated${target}`;
      case "security_check_submitted":
        return `Security check submitted`;
      default:
        return capitalize(t.replace(/_/g, " ")) || "Activity";
    }
  };

  const iconFor = (row: ActivityRow) => {
    const t = row.type || "";
    if (t.startsWith("task_"))
      return <MaterialIcons name="assignment" size={18} color={C.accent} />;
    if (t.startsWith("report_"))
      return <MaterialIcons name="assessment" size={18} color={C.accent} />;
    if (t.startsWith("scheduler_item") || t.startsWith("schedule_"))
      return <Ionicons name="calendar" size={18} color={C.accent} />; // 👈 handle both
    if (t === "security_check_submitted")
      return <Ionicons name="shield-checkmark" size={18} color={C.accent} />;
    return <MaterialIcons name="receipt-long" size={18} color={C.accent} />;
  };

  const subtitleFor = (row: ActivityRow) => {
    const who = row.actor?.name || row.actor?.role || "Someone";
    const when = formatWhen(row.ts);
    const tgt = row.target?.id
      ? ` • #${String(row.target?.id).slice(0, 6)}`
      : "";
    return `${who}${tgt} • ${when}`;
  };

  const messageFor = (row: ActivityRow) => {
    const m = (row.message || "").trim();
    if (!m) return null;
    return m.length > 160 ? m.slice(0, 159) + "…" : m;
  };

  return (
    <View style={s.container}>
      {/* crossfade layers to match Home */}
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: Pal.light.bg }]}
      />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: Pal.dark.bg, opacity: themeAnim },
        ]}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={s.smallGreyBtn}
            accessibilityLabel="Back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={isDark ? "#E5E7EB" : "#111827"}
            />
          </TouchableOpacity>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="time-outline" size={18} color={C.text} />
            <Text style={s.headerTitle}>Activity Log</Text>
          </View>
          <TouchableOpacity
            onPress={onRefresh}
            style={s.headerIconBtn}
            activeOpacity={0.88}
            accessibilityLabel="Refresh"
          >
            <Ionicons name="refresh" size={18} color={C.text} />
          </TouchableOpacity>
        </View>

        {!buildingId ? (
          <View style={[s.center, { paddingTop: 24 }]}>
            <Text style={s.bannerTitle}>
              Select a building to view activity
            </Text>
            <Text style={s.bannerText}>
              All activity is scoped to the chosen building.
            </Text>
          </View>
        ) : loading ? (
          <View style={[s.center, { paddingTop: 32 }]}>
            <ActivityIndicator size="large" />
            <Text style={[s.cardSubtitle, { marginTop: 8 }]}>Loading…</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(it) => it.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={C.textMuted}
              />
            }
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => {
              const msg = messageFor(item);
              return (
                <View style={s.rowCard}>
                  <View style={s.rowIconPill}>{iconFor(item)}</View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.rowTitle} numberOfLines={1}>
                      {titleFor(item)}
                    </Text>
                    <Text style={s.rowSubtitle} numberOfLines={1}>
                      {subtitleFor(item)}
                    </Text>
                    {!!msg && (
                      <Text style={s.rowMessage} numberOfLines={2}>
                        {msg}
                      </Text>
                    )}
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={[s.center, { paddingVertical: 24 }]}>
                <Text style={s.cardSubtitle}>No activity yet.</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

export default ActivityLog;

/* ---------------- Helpers & Styles ---------------- */

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function prettyKind(kind?: string) {
  if (!kind) return "Item";
  switch (kind) {
    case "task":
      return "Task";
    case "report":
      return "Report";
    case "scheduler_item":
      return "Schedule";
    case "security_run":
      return "Security";
    default:
      return capitalize(kind.replace(/_/g, " "));
  }
}

function formatWhen(ts?: Timestamp | null) {
  if (!ts?.toDate) return "Unknown time";
  const d = ts.toDate();
  const now = new Date().getTime();
  const diff = Math.max(0, now - d.getTime());

  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  // Fallback to a crisp short date
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

const getStyles = (isDark: boolean) => {
  const C = isDark ? Pal.dark : Pal.light;
  const shadowBase =
    Platform.OS === "ios"
      ? {
          shadowColor: "#000",
          shadowOpacity: isDark ? 0.18 : 0.08,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 8 },
        }
      : { elevation: 5 };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
    },
    center: { justifyContent: "center", alignItems: "center" },

    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "900",
      color: C.text,
      letterSpacing: 0.2,
    },
    headerIconBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: C.subtle,
      borderWidth: 1,
      borderColor: C.outline,
      ...(Platform.OS === "ios"
        ? {
            shadowColor: "#000",
            shadowOpacity: 0.04,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 3,
          }
        : { elevation: 2 }),
    },

    // Banner (no building selected)
    bannerTitle: {
      fontWeight: "900",
      color: isDark ? C.text : "#7C2D12",
      fontSize: 14,
    },
    bannerText: {
      marginTop: 4,
      color: isDark ? C.textMuted : "#7C2D12",
      fontWeight: "700",
      fontSize: 12,
    },

    // Card + row
    rowCard: {
      flexDirection: "row",
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      backgroundColor: C.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.outline,
      ...shadowBase,
    },
    rowIconPill: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#0F172A" : "#F3F4F6",
      borderWidth: 1,
      borderColor: isDark ? "#1F2937" : "#E5E7EB",
    },
    rowTitle: {
      color: C.text,
      fontSize: 15,
      fontWeight: "900",
      letterSpacing: 0.2,
    },
    rowSubtitle: {
      color: C.textMuted,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 1,
    },
    smallGreyBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#111827" : "#E5E7EB",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },
    rowMessage: {
      color: C.text,
      opacity: 0.9,
      fontSize: 13,
      fontWeight: "700",
      marginTop: 6,
    },

    cardSubtitle: {
      fontSize: 12,
      fontWeight: "700",
      color: C.textMuted,
    },
  });
};
