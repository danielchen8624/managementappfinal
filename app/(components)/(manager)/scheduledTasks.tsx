// app/scheduled_tasks.tsx
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
} from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../../firebaseConfig";
import { useBuilding } from "../../BuildingContext";
import { useTheme } from "../../ThemeContext";

/** -------------------------------------------------------
 * Types
 * ------------------------------------------------------*/
type TaskItem = {
  id: string;
  title?: string;
  description?: string;
  roomNumber?: string;
  assignedToName?: string;
  priority?: number;          // 1..n (lower = higher urgency)
  status?: string;            // "open" | "in_progress" | "done" | "completed" | etc.
  forToday?: boolean;         // filter true
  createdAt?: any;            // Firestore Timestamp
  // dueAt?: any;             // intentionally not shown per request
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
    warning: "#B45309", // amber
    success: "#059669", // green
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
    warning: "#F59E0B", // amber
    success: "#10B981", // green
    danger: "#EF4444",
  },
};

function isCompletedStatus(s?: string) {
  const v = (s || "").toLowerCase();
  return v === "done" || v === "completed" || v === "closed";
}

/** -------------------------------------------------------
 * Screen
 * ------------------------------------------------------*/
export default function ScheduledTasksScreen() {
  const { buildingId } = useBuilding();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const C = isDark ? Pal.dark : Pal.light;
  const s = useMemo(() => getStyles(isDark), [isDark]);

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [qText, setQText] = useState("");

  // header crossfade polish
  const themeAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(themeAnim, {
      toValue: isDark ? 1 : 0,
      duration: 220,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [isDark, themeAnim]);

  // Live subscription: /buildings/{buildingId}/tasks where forToday == true
  useEffect(() => {
    if (!buildingId) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const baseRef = collection(db, "buildings", buildingId, "tasks");
    const qy = query(baseRef, where("forToday", "==", true));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        const list: TaskItem[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        // Order by priority: P1 → P2 → P3 (lower number first)
        list.sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
        setTasks(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [buildingId]);

  const filtered = useMemo(() => {
    const q = qText.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((t) => {
      const hay = `${t.title || ""} ${t.description || ""} ${t.assignedToName || ""} ${t.roomNumber || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [tasks, qText]);

  const renderItem = useCallback(
    ({ item }: { item: TaskItem }) => {
      const completed = isCompletedStatus(item.status);
      const statusColor = completed ? C.success : C.warning; // ✅ green = done, amber = in progress

      return (
        <View style={s.cardWrap}>
          <View style={s.card}>
            {/* left status rail */}
            <View style={s.statusRail}>
              <View style={[s.statusPill, { backgroundColor: statusColor }]} />
            </View>

            <View style={{ flex: 1 }}>
              {/* Title */}
              <View style={s.titleRow}>
                <Text numberOfLines={1} style={s.title}>
                  {item.title || "Untitled task"}
                </Text>
              </View>

              {!!item.description && (
                <Text numberOfLines={2} style={s.desc}>
                  {item.description}
                </Text>
              )}

              <View style={s.metaRow}>
                {!!item.assignedToName && (
                  <View style={s.metaItem}>
                    <Ionicons name="person-circle-outline" size={14} color={C.textMuted} />
                    <Text style={s.metaText}>{item.assignedToName}</Text>
                  </View>
                )}
                {!!item.roomNumber && (
                  <View style={s.metaItem}>
                    <Ionicons name="business-outline" size={14} color={C.textMuted} />
                    <Text style={s.metaText}>Room {item.roomNumber}</Text>
                  </View>
                )}
              </View>

              {/* ⬇️ Priority pill moved to the bottom of the card */}
              {typeof item.priority === "number" && (
                <View style={s.footerRow}>
                  <View style={[s.priorityPill, s.priorityBottom]}>
                    <Text style={s.priorityText}>P{item.priority}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Status text pill (top-right) */}
            <View style={[s.sidePill, { borderColor: statusColor }]}>
              <Text style={[s.sidePillText, { color: statusColor }]}>
                {completed ? "COMPLETED" : "IN PROGRESS"}
              </Text>
            </View>
          </View>
        </View>
      );
    },
    [C, s]
  );

  return (
    <SafeAreaView style={s.container}>
      {/* crossfade layers */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Pal.light.bg }]} />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: Pal.dark.bg, opacity: themeAnim },
        ]}
      />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} activeOpacity={0.9}>
          <Ionicons name="chevron-back" size={18} color={C.text} />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <MaterialIcons name="event-available" size={18} color={C.text} />
          <Text style={s.headerTitle}>Scheduled Tasks</Text>
        </View>
        <View style={s.headerBtn} />
      </View>

      {/* Select building nudge */}
      {!buildingId && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <View style={s.inlineBanner}>
            <Text style={s.inlineBannerTitle}>Select a building to continue</Text>
            <Text style={s.inlineBannerText}>Tasks are scoped to your chosen building.</Text>
          </View>
        </View>
      )}

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={16} color={C.textMuted} />
          <TextInput
            value={qText}
            onChangeText={setQText}
            placeholder="Search tasks, rooms, assignees…"
            placeholderTextColor={C.textMuted}
            style={s.searchInput}
          />
          {qText.length > 0 && (
            <TouchableOpacity onPress={() => setQText("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={[s.center, { paddingVertical: 16 }]}>
          <ActivityIndicator />
          <Text style={[s.muted, { marginTop: 8 }]}>Loading tasks…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24 }}
          ListEmptyComponent={
            <View style={[s.center, { paddingVertical: 24 }]}>
              <Text style={s.muted}>No scheduled tasks for today.</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

/** -------------------------------------------------------
 * Styles (mirrors your aesthetic)
 * ------------------------------------------------------*/
const getStyles = (isDark: boolean) => {
  const C = isDark ? Pal.dark : Pal.light;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
    },

    // Header
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

    // Nudge
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

    // Search
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

    center: { alignItems: "center", justifyContent: "center" },
    muted: { color: C.textMuted, fontWeight: "700" },

    // Cards
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
    statusPill: {
      width: 4,
      borderRadius: 8,
      height: "78%",
    },
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

    // Priority pill (neutral)
    priorityPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: isDark ? "#1F2937" : "#F3F4F6",
      borderWidth: 1,
      borderColor: isDark ? C.outlineBold : C.outline,
    },
    priorityText: {
      fontSize: 11,
      fontWeight: "900",
      color: C.text,
      letterSpacing: 0.3,
    },

    desc: {
      color: C.textMuted,
      fontSize: 13,
      fontWeight: "700",
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginTop: 8,
      flexWrap: "wrap",
    },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    metaText: { color: C.textMuted, fontSize: 12, fontWeight: "800" },

    // Footer row to hold the bottom priority pill
    footerRow: {
      marginTop: 10,
      flexDirection: "row",
      justifyContent: "flex-start",
    },
    priorityBottom: {
      alignSelf: "flex-start",
    },

    // Status text (top-right)
    sidePill: {
      position: "absolute",
      right: 12,
      top: 12,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      borderWidth: 1,
    },
    sidePillText: {
      fontSize: 10,
      fontWeight: "900",
      letterSpacing: 0.4,
    },
  });
};
