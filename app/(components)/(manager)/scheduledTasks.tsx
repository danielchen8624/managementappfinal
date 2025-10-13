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
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../../firebaseConfig";
import { useBuilding } from "../../BuildingContext";
import { useTheme } from "../../ThemeContext";

/* ---------------- Types ---------------- */
type TaskItem = {
  id: string;
  title?: string;
  description?: string;
  roomNumber?: string;
  assignedToName?: string;
  priority?: number;   // 1..n (lower = higher urgency)
  status?: string;     // "open" | "in_progress" | "done" | "completed" | ...
  forToday?: boolean;
  createdAt?: any;     // Firestore Timestamp
};

/* -------------- Minimal Theme --------------
   Neutral greys + a very soft blue accent. */
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

function isCompletedStatus(s?: string) {
  const v = (s || "").toLowerCase();
  return v === "done" || v === "completed" || v === "closed";
}

type StatusFilter = "all" | "active" | "completed";

/* --------------- Screen --------------- */
export default function ScheduledTasksScreen() {
  const { buildingId } = useBuilding();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const C = isDark ? Pal.dark : Pal.light;
  const s = useMemo(() => getStyles(isDark), [isDark]);

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [qText, setQText] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  // subtle bg crossfade for theme switch
  const themeAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(themeAnim, {
      toValue: isDark ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
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
        // Priority (low number first), then createdAt desc
        list.sort((a, b) => {
          const pa = a.priority ?? 999;
          const pb = b.priority ?? 999;
          if (pa !== pb) return pa - pb;
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
        setTasks(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [buildingId]);

  const filtered = useMemo(() => {
    const q = qText.trim().toLowerCase();
    let base = tasks;
    if (filter === "active") base = base.filter((t) => !isCompletedStatus(t.status));
    if (filter === "completed") base = base.filter((t) => isCompletedStatus(t.status));
    if (!q) return base;
    return base.filter((t) => {
      const hay = `${t.title || ""} ${t.description || ""} ${t.assignedToName || ""} ${t.roomNumber || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [tasks, qText, filter]);

  const headerCounts = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => isCompletedStatus(t.status)).length;
    const active = total - completed;
    return { total, active, completed };
  }, [tasks]);

  const Seg: React.FC<{ label: string; active?: boolean; onPress(): void }> = ({
    label,
    active,
    onPress,
  }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[s.seg, active && s.segActive]}
    >
      <Text style={[s.segText, active && s.segTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderItem = useCallback(
    ({ item }: { item: TaskItem }) => {
      const done = isCompletedStatus(item.status);

      return (
        <View style={s.row}>
          {/* tiny status dot */}
          <View
            style={[
              s.dot,
              { backgroundColor: done ? C.success : C.accent },
            ]}
          />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={s.title}>
              {item.title || "Untitled task"}
            </Text>

            {/* meta line: only show what exists, compact */}
            <View style={s.metaLine}>
              {!!item.assignedToName && (
                <Text numberOfLines={1} style={s.meta}>
                  {item.assignedToName}
                </Text>
              )}
              {!!item.assignedToName && !!item.roomNumber && <Text style={s.metaDivider}>·</Text>}
              {!!item.roomNumber && (
                <Text numberOfLines={1} style={s.meta}>
                  Room {item.roomNumber}
                </Text>
              )}
            </View>

            {!!item.description && (
              <Text numberOfLines={2} style={s.desc}>
                {item.description}
              </Text>
            )}
          </View>

          {/* small priority capsule, very low-key */}
          {typeof item.priority === "number" && (
            <View style={s.priorityCapsule}>
              <Text style={s.priorityText}>P{item.priority}</Text>
            </View>
          )}
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
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: Pal.dark.bg, opacity: themeAnim },
        ]}
      />

      {/* Header (very light, airy) */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} activeOpacity={0.9}>
          <Ionicons name="chevron-back" size={18} color={C.text} />
        </TouchableOpacity>

        <View style={s.headerMid}>
          <Text style={s.headerTitle}>Scheduled</Text>
          <Text style={s.headerSub}>
            {headerCounts.active} active • {headerCounts.completed} done
          </Text>
        </View>

        <View style={s.iconBtn} />
      </View>

      {/* Search + Segmented filter */}
      <View style={s.controlsWrap}>
        <View style={s.searchBox}>
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
          <Seg label="All"        active={filter === "all"}       onPress={() => setFilter("all")} />
          <Seg label="Active"     active={filter === "active"}    onPress={() => setFilter("active")} />
          <Seg label="Completed"  active={filter === "completed"} onPress={() => setFilter("completed")} />
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
                {qText ? "No results" : "Nothing scheduled for today"}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

/* ---------------- Styles ---------------- */
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

    priorityCapsule: {
      alignSelf: "flex-start",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: C.hairline,
      backgroundColor: C.surface,
      marginLeft: 8,
    },
    priorityText: {
      fontSize: 11,
      fontWeight: "900",
      color: C.textMuted,
      letterSpacing: 0.3,
    },

    /* Misc */
    center: { alignItems: "center", justifyContent: "center" },
    muted: { color: C.textMuted, fontWeight: "700" },
  });
};
