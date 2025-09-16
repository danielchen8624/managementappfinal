// app/manager_report.tsx
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
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TextInput,
  Animated,
  Easing,
  SafeAreaView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../../firebaseConfig";
import { useBuilding } from "../../BuildingContext";
import { useTheme } from "../../ThemeContext";

/** -------------------------------------------------------
 * Types
 * ------------------------------------------------------*/
type ReportItem = {
  id: string;
  title?: string;
  description?: string;
  status?: string;
  resolved?: boolean;
  createdAt?: any;
  createdByName?: string;
  createdBy?: string;
  roomNumber?: string;
  priority?: number;
  severity?: "low" | "medium" | "high" | string;
  managerHasReviewed?: boolean;
  reporter_name?: string | null; // <-- NEW
};

/** -------------------------------------------------------
 * Palette
 * ------------------------------------------------------*/
const Pal = {
  light: {
    bg: "#F5F7FA",
    surface: "#FFFFFF",
    subtle: "#F3F4F6",
    text: "#0F172A",
    textMuted: "#475569",
    outline: "#E5E7EB",
    outlineBold: "#CBD5E1",
    primary: "#1D4ED8",
    warning: "#B45309",
    success: "#059669",
    danger: "#DC2626",
  },
  dark: {
    bg: "#0B1220",
    surface: "#111827",
    subtle: "#0F172A",
    text: "#F3F4F6",
    textMuted: "#94A3B8",
    outline: "#1F2937",
    outlineBold: "#334155",
    primary: "#2563EB",
    warning: "#F59E0B",
    success: "#10B981",
    danger: "#EF4444",
  },
};

function fmt(ts?: any) {
  try {
    const d = ts?.toDate?.();
    if (!d) return "—";
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
}

function severityPillColor(sev?: string, C?: any) {
  const s = (sev || "").toLowerCase();
  if (s === "high") return C?.danger;
  if (s === "medium") return C?.warning;
  if (s === "low") return C?.success;
  return C?.outlineBold;
}

function reviewStateColor(
  reviewed: boolean | undefined,
  C: typeof Pal.light | typeof Pal.dark
) {
  return reviewed ? C.success : C.primary;
}

/** -------------------------------------------------------
 * Screen
 * ------------------------------------------------------*/
export default function ManagerAllReportsScreen() {
  const { buildingId } = useBuilding();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const C = isDark ? Pal.dark : Pal.light;
  const s = useMemo(() => getStyles(isDark), [isDark]);

  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");
  const [qText, setQText] = useState("");

  const themeAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(themeAnim, {
      toValue: isDark ? 1 : 0,
      duration: 220,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [isDark, themeAnim]);

  useEffect(() => {
    if (!buildingId) {
      setReports([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const baseRef = collection(db, "buildings", buildingId, "reports");

    let qy = query(baseRef, orderBy("createdAt", "desc"));
    if (filter === "open") {
      try {
        qy = query(
          baseRef,
          where("status", "in", ["open", "investigating", "triage"]),
          orderBy("createdAt", "desc")
        );
      } catch {
        qy = query(
          baseRef,
          where("resolved", "==", false),
          orderBy("createdAt", "desc")
        );
      }
    } else if (filter === "resolved") {
      try {
        qy = query(
          baseRef,
          where("status", "in", ["closed", "resolved"]),
          orderBy("createdAt", "desc")
        );
      } catch {
        qy = query(
          baseRef,
          where("resolved", "==", true),
          orderBy("createdAt", "desc")
        );
      }
    }

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
  }, [buildingId, filter]);

  const filtered = useMemo(() => {
    const q = qText.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((r) => {
      const hay = `${r.title || ""} ${r.description || ""} ${
        r.reporter_name || ""
      }`.toLowerCase(); // <-- search reporter_name
      return hay.includes(q);
    });
  }, [reports, qText]);

  const counts = useMemo(() => {
    const all = reports.length;
    const open =
      reports.filter(
        (r) =>
          (r.status &&
            ["open", "investigating", "triage"].includes(
              (r.status || "").toLowerCase()
            )) ||
          r.resolved === false
      ).length || 0;
    const res =
      reports.filter(
        (r) =>
          (r.status &&
            ["closed", "resolved"].includes((r.status || "").toLowerCase())) ||
          r.resolved === true
      ).length || 0;
    return { all, open, res };
  }, [reports]);

  const renderItem = useCallback(
    ({ item }: { item: ReportItem }) => {
      const reviewed = !!item.managerHasReviewed;
      const reviewBg = reviewStateColor(reviewed, C);
      const sevBg = severityPillColor(item.severity, C);
      const reviewLabel = reviewed ? "Reviewed" : "In Progress";

      return (
        <View style={s.cardWrap}>
          <View style={s.card}>
            <View style={s.statusRail}>
              <View style={[s.statusPill, { backgroundColor: reviewBg }]} />
            </View>

            <View style={{ flex: 1 }}>
              <View style={s.titleRow}>
                <Text numberOfLines={1} style={s.title}>
                  {item.title || "Untitled report"}
                </Text>
                <View style={[s.chip, { backgroundColor: reviewBg }]}>
                  <Text style={s.chipText}>{reviewLabel}</Text>
                </View>
              </View>

              <Text numberOfLines={2} style={s.desc}>
                {item.description || "No description."}
              </Text>

              <View style={s.metaRow}>
                <View style={s.metaItem}>
                  <Ionicons
                    name="person-circle-outline"
                    size={14}
                    color={C.textMuted}
                  />
                  <Text style={s.metaText}>
                    {item.reporter_name || "Unknown"}{" "}
                    {/* <-- show reporter_name */}
                  </Text>
                </View>
                <View style={s.metaItem}>
                  <Ionicons name="time-outline" size={14} color={C.textMuted} />
                  <Text style={s.metaText}>{fmt(item.createdAt)}</Text>
                </View>
                {!!item.roomNumber && (
                  <View style={s.metaItem}>
                    <Ionicons
                      name="business-outline"
                      size={14}
                      color={C.textMuted}
                    />
                    <Text style={s.metaText}>Room {item.roomNumber}</Text>
                  </View>
                )}
              </View>
            </View>

            {!!item.severity && (
              <View style={[s.sidePill, { borderColor: sevBg }]}>
                <Text style={[s.sidePillText, { color: sevBg }]}>
                  {(item.severity || "").toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>
      );
    },
    [C, s]
  );

  return (
    <SafeAreaView style={[s.container]}>
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: Pal.light.bg }]}
      />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: Pal.dark.bg, opacity: themeAnim },
        ]}
      />

      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.headerBtn}
          activeOpacity={0.9}
        >
          <Ionicons name="chevron-back" size={18} color={C.text} />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <MaterialIcons name="assessment" size={18} color={C.text} />
          <Text style={s.headerTitle}>All Reports</Text>
        </View>
        <View style={s.headerBtn} />
      </View>

      {!buildingId && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <View style={s.inlineBanner}>
            <Text style={s.inlineBannerTitle}>
              Select a building to continue
            </Text>
            <Text style={s.inlineBannerText}>
              Reports are scoped to your chosen building.
            </Text>
          </View>
        </View>
      )}

      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={16} color={C.textMuted} />
          <TextInput
            value={qText}
            onChangeText={setQText}
            placeholder="Search title, description, reporter…"
            placeholderTextColor={C.textMuted}
            style={s.searchInput}
          />
        </View>

        <View style={s.segment}>
          <SegBtn
            label={`All ${counts.all}`}
            active={filter === "all"}
            onPress={() => setFilter("all")}
            isDark={isDark}
          />
          <SegBtn
            label={`Open ${counts.open}`}
            active={filter === "open"}
            onPress={() => setFilter("open")}
            isDark={isDark}
          />
          <SegBtn
            label={`Resolved ${counts.res}`}
            active={filter === "resolved"}
            onPress={() => setFilter("resolved")}
            isDark={isDark}
          />
        </View>
      </View>

      {loading ? (
        <View style={[s.center, { paddingVertical: 16 }]}>
          <ActivityIndicator />
          <Text style={[s.muted, { marginTop: 8 }]}>Loading reports…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 24,
          }}
          ListEmptyComponent={
            <View style={[s.center, { paddingVertical: 24 }]}>
              <Text style={s.muted}>No reports found.</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

/** -------------------------------------------------------
 * Tiny Segmented Button
 * ------------------------------------------------------*/
function SegBtn({
  label,
  active,
  onPress,
  isDark,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  isDark: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: active
          ? isDark
            ? "#3B82F6"
            : "#1D4ED8"
          : isDark
          ? "#1F2937"
          : "#E5E7EB",
        backgroundColor: active
          ? isDark
            ? "rgba(37,99,235,0.15)"
            : "rgba(29,78,216,0.08)"
          : "transparent",
        marginRight: 8,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "800",
          color: active
            ? isDark
              ? "#93C5FD"
              : "#1D4ED8"
            : isDark
            ? "#E5E7EB"
            : "#0F172A",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/** -------------------------------------------------------
 * Styles
 * ------------------------------------------------------*/
const getStyles = (isDark: boolean) => {
  const C = isDark ? Pal.dark : Pal.light;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: C.outline,
      backgroundColor: C.surface,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.subtle,
      borderWidth: 1,
      borderColor: C.outline,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "900",
      color: C.text,
      letterSpacing: 0.2,
    },
    inlineBanner: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: isDark ? "#132235" : "#FDF5E6",
      borderWidth: 1,
      borderColor: isDark ? C.outlineBold : "#F2D9A6",
      marginTop: 10,
    },
    inlineBannerTitle: {
      fontWeight: "900",
      color: isDark ? C.text : "#7C2D12",
    },
    inlineBannerText: {
      marginTop: 4,
      color: isDark ? C.textMuted : "#7C2D12",
      fontWeight: "700",
    },
    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: isDark ? "#0B1220" : "#F8FAFC",
      borderWidth: 1,
      borderColor: isDark ? "#1F2937" : "#E5E7EB",
      marginBottom: 8,
    },
    searchInput: {
      flex: 1,
      color: C.text,
      fontWeight: "700",
      paddingVertical: 0,
    },
    segment: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
    center: { alignItems: "center", justifyContent: "center" },
    muted: { color: C.textMuted, fontWeight: "700" },
    cardWrap: {
      shadowColor: "#000",
      shadowOpacity: isDark ? 0.25 : 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
      marginBottom: 12,
    },
    card: {
      borderRadius: 14,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.outline,
      padding: 14,
      flexDirection: "row",
      gap: 12,
      position: "relative",
      overflow: "hidden",
    },
    statusRail: {
      position: "absolute",
      left: 8,
      top: 8,
      bottom: 8,
      width: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    statusPill: { width: 4, borderRadius: 8, height: "78%" },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      marginBottom: 6,
    },
    title: {
      fontSize: 15,
      fontWeight: "900",
      color: C.text,
      letterSpacing: 0.2,
      flex: 1,
    },
    chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
    chipText: {
      color: "#fff",
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 0.3,
    },
    desc: { color: C.textMuted, fontSize: 13, fontWeight: "700" },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginTop: 8,
      flexWrap: "wrap",
    },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    metaText: { color: C.textMuted, fontSize: 12, fontWeight: "800" },
    sidePill: {
      position: "absolute",
      right: 12,
      top: 12,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      borderWidth: 1,
    },
    sidePillText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.4 },
  });
};
