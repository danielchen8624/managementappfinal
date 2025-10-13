// app/manager_report.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TextInput,
  Animated,
  Easing,
  SafeAreaView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../../../firebaseConfig";
import { useBuilding } from "../../BuildingContext";
import { useTheme } from "../../ThemeContext";

/* ---------------- Types ---------------- */
type Actor = { id?: string | null; name?: string | null; role?: string | null } | null;

type ReportItem = {
  id: string;
  title?: string;
  description?: string;
  status?: string;            // "need assistance" | "fixed" | etc.
  resolved?: boolean;         // legacy fallback
  createdAt?: any;            // Firestore Timestamp
  createdBy?: Actor;          // preferred
  actor?: Actor;              // fallback
  createdByName?: string;     // legacy fallback
  reporter_name?: string;     // legacy fallback
  aptNumber?: string | null;
};

/* -------------- Minimal Theme (same as scheduled_tasks) -------------- */
const Pal = {
  light: {
    bg: "#F7F8FA",
    surface: "#FFFFFF",
    text: "#0B1220",
    textMuted: "#5B6472",
    hairline: "#E7EAF0",
    accent: "#147CE5",
    accentSoft: "#E8F1FF",
    success: "#16A34A",
    subtle: "#F3F4F6",
  },
  dark: {
    bg: "#0A0F1A",
    surface: "#0F1626",
    text: "#E6EAF2",
    textMuted: "#9AA4B2",
    hairline: "#1F2A3A",
    accent: "#4CA2FF",
    accentSoft: "#11233B",
    success: "#22C55E",
    subtle: "#121A28",
  },
};

type StatusFilter = "all" | "needs" | "fixed";

/* ---------------- Helpers ---------------- */
function reporterFrom(r: ReportItem) {
  return (
    r?.createdBy?.name ||
    r?.actor?.name ||
    r?.createdByName ||
    r?.reporter_name ||
    "Unknown"
  );
}

function isFixed(r: ReportItem) {
  const s = (r.status || "").toLowerCase();
  if (["fixed", "resolved", "closed"].includes(s)) return true;
  if (typeof r.resolved === "boolean") return r.resolved;
  return false;
}
function isNeeds(r: ReportItem) {
  const s = (r.status || "").toLowerCase();
  return s === "need assistance" || s === "needs assistance";
}

/* ---------------- Screen ---------------- */
export default function ManagerReportsScreen() {
  const { buildingId } = useBuilding();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const C = isDark ? Pal.dark : Pal.light;
  const s = useMemo(() => getStyles(isDark), [isDark]);

  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [qText, setQText] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  // subtle bg crossfade like scheduled_tasks
  const themeAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(themeAnim, {
      toValue: isDark ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [isDark, themeAnim]);

  // Live subscription: recent reports for this building
  useEffect(() => {
    if (!buildingId) {
      setReports([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const baseRef = collection(db, "buildings", buildingId, "reports");
    const qy = query(baseRef, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        const list: ReportItem[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        setReports(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [buildingId]);

  // search + filter (client-side to keep it simple)
  const filtered = useMemo(() => {
    let base = reports;
    if (filter === "needs") base = base.filter(isNeeds);
    if (filter === "fixed") base = base.filter(isFixed);
    const q = qText.trim().toLowerCase();
    if (!q) return base;
    return base.filter((r) => {
      const hay = `${r.title || ""} ${r.description || ""} ${reporterFrom(r)} ${r.aptNumber || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [reports, qText, filter]);

  // counts for header subtitle
  const counts = useMemo(() => {
    const total = reports.length;
    const needs = reports.filter(isNeeds).length;
    const fixed = reports.filter(isFixed).length;
    return { total, needs, fixed };
  }, [reports]);

  const Seg: React.FC<{ label: string; active?: boolean; onPress(): void }> = ({
    label,
    active,
    onPress,
  }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[s.seg, active && s.segActive]}>
      <Text style={[s.segText, active && s.segTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderItem = useCallback(
    ({ item }: { item: ReportItem }) => {
      const done = isFixed(item);
      const dotColor = done ? C.success : C.accent;
      const subtitleBits = [
        reporterFrom(item),
        item.aptNumber ? `Apt ${item.aptNumber}` : null,
      ].filter(Boolean);

      return (
        <View style={s.row}>
          {/* tiny status dot (green = fixed, blue = needs assistance/other) */}
          <View style={[s.dot, { backgroundColor: dotColor }]} />

          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={s.title}>
              {item.title || "Untitled report"}
            </Text>

            <View style={s.metaLine}>
              {subtitleBits.map((bit, idx) => (
                <React.Fragment key={`${item.id}-m-${idx}`}>
                  {idx > 0 && <Text style={s.metaDivider}>·</Text>}
                  <Text numberOfLines={1} style={s.meta}>
                    {bit}
                  </Text>
                </React.Fragment>
              ))}
            </View>

            {!!item.description && (
              <Text numberOfLines={2} style={s.desc}>
                {item.description}
              </Text>
            )}
          </View>
        </View>
      );
    },
    [s, C]
  );

  return (
    <SafeAreaView style={s.container}>
      {/* crossfade background */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Pal.light.bg }]} />
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: Pal.dark.bg, opacity: themeAnim }]}
      />

      {/* Header (identical layout to scheduled_tasks) */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} activeOpacity={0.9}>
          <Ionicons name="chevron-back" size={18} color={C.text} />
        </TouchableOpacity>

        <View style={s.headerMid}>
          <Text style={s.headerTitle}>Reports</Text>
          <Text style={s.headerSub}>
            {counts.needs} need assistance • {counts.fixed} fixed
          </Text>
        </View>

        <View style={s.iconBtn} />
      </View>

      {/* Search + Segmented filter (same component styling) */}
      <View style={s.controlsWrap}>
        <View className="search" style={s.searchBox}>
          <Ionicons name="search-outline" size={16} color={C.textMuted} />
          <TextInput
            value={qText}
            onChangeText={setQText}
            placeholder="Search"
            placeholderTextColor={C.textMuted}
            style={s.searchInput}
          />
          {qText.length > 0 && (
            <TouchableOpacity
              onPress={() => setQText("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={s.segment}>
          <Seg label="All"               active={filter === "all"}   onPress={() => setFilter("all")} />
          <Seg label="Needs assistance"  active={filter === "needs"} onPress={() => setFilter("needs")} />
          <Seg label="Fixed"             active={filter === "fixed"} onPress={() => setFilter("fixed")} />
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={[s.center, { paddingVertical: 24 }]}>
          <ActivityIndicator />
          <Text style={s.muted}>Loading</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28 }}
          ItemSeparatorComponent={() => <View style={s.hairline} />}
          ListEmptyComponent={
            <View style={[s.center, { paddingVertical: 40 }]}>
              <Ionicons name="clipboard-outline" size={26} color={C.textMuted} />
              <Text style={[s.muted, { marginTop: 8 }]}>
                {qText ? "No results" : "No reports yet"}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

/* ---------------- Styles (copied structure from scheduled_tasks) ---------------- */
const getStyles = (isDark: boolean) => {
  const C = isDark ? Pal.dark : Pal.light;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
    },

    /* Header */
    header: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 10,
      backgroundColor: C.bg,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: C.hairline,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.hairline,
    },
    headerMid: { alignItems: "center", gap: 2 },
    headerTitle: {
      fontSize: 20,
      fontWeight: "900",
      color: C.text,
      letterSpacing: 0.2,
    },
    headerSub: {
      fontSize: 12,
      fontWeight: "700",
      color: C.textMuted,
    },

    /* Controls */
    controlsWrap: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 6,
      gap: 10,
    },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: Platform.select({ ios: 10, android: 8, default: 10 }),
      borderRadius: 12,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.hairline,
    },
    searchInput: {
      flex: 1,
      color: C.text,
      fontWeight: "700",
      paddingVertical: 0,
    },

    segment: {
      flexDirection: "row",
      backgroundColor: isDark ? C.subtle : C.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.hairline,
      overflow: "hidden",
    },
    seg: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 8,
    },
    segActive: {
      backgroundColor: isDark ? C.accentSoft : C.accentSoft,
    },
    segText: {
      fontSize: 12,
      fontWeight: "800",
      color: C.textMuted,
      letterSpacing: 0.2,
    },
    segTextActive: {
      color: isDark ? "#EAF2FF" : C.accent,
    },

    /* List rows */
    hairline: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: C.hairline,
      marginLeft: 16 + 10 + 8, // align under content, not dot
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      paddingVertical: 14,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginTop: 6,
      marginLeft: 10,
    },
    title: {
      fontSize: 16,
      fontWeight: "900",
      color: C.text,
      letterSpacing: 0.2,
    },
    metaLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 4,
      flexWrap: "nowrap",
    },
    meta: {
      fontSize: 12,
      color: C.textMuted,
      fontWeight: "700",
    },
    metaDivider: {
      fontSize: 12,
      color: C.textMuted,
      opacity: 0.7,
      fontWeight: "700",
    },
    desc: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 18,
      color: C.textMuted,
      fontWeight: "700",
    },

    /* Misc */
    center: { alignItems: "center", justifyContent: "center" },
    muted: { color: C.textMuted, fontWeight: "700" },
  });
};
