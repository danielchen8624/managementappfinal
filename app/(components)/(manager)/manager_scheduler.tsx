// app/(manager)/scheduler_readonly.tsx
// Read-only view of the scheduler for MANAGERS.
// Visuals match scheduler.tsx, but all write interactions are disabled.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../ThemeContext";
import { db } from "../../../firebaseConfig";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useBuilding } from "../../BuildingContext";

/* ---------- Types & constants (mirrors scheduler.tsx) ---------- */
type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
const DAYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABEL: Record<DayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

type Worker = {
  id: string;
  name: string;
  email?: string;
};

export type TemplateItem = {
  id: string;
  title: string;
  description?: string;
  defaultPriority?: number; // 1 both, 2 important, 3 urgent, 4 none
  roleNeeded?: string | null;
  assignedWorkerIds?: string[];
  order: number;
  active: boolean;
  roomNumber?: string | null;
  [key: string]: any;
};

const makeEmpty = (): Record<DayKey, TemplateItem[]> => ({
  mon: [],
  tue: [],
  wed: [],
  thu: [],
  fri: [],
  sat: [],
  sun: [],
});

const makeLoading = (): Record<DayKey, boolean> => ({
  mon: true,
  tue: true,
  wed: true,
  thu: true,
  fri: true,
  sat: true,
  sun: true,
});

function deepClone<T>(arr: T[]): T[] {
  return arr.map((x) => ({ ...(x as any) }));
}

const { height: SCREEN_H } = Dimensions.get("window");
const CARD_HEIGHT = Math.max(100, Math.floor(SCREEN_H / 8));

/* =====================  MAIN  ===================== */
export default function ManagerSchedulerReadOnly() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const styles = getStyles(isDark);

  // 🔑 building context
  const { buildingId } = useBuilding();

  const [dayIndex, setDayIndex] = useState(0);
  const selectedDay: DayKey = DAYS[dayIndex];

  const [itemsByDay, setItemsByDay] = useState<Record<DayKey, TemplateItem[]>>(
    makeEmpty()
  );
  const originalRef = useRef<Record<DayKey, TemplateItem[]>>(makeEmpty());
  const [loadingByDay, setLoadingByDay] = useState<Record<DayKey, boolean>>(
    makeLoading()
  );

  // Workers (read-only) to resolve assigned names.
  const [workers, setWorkers] = useState<Worker[]>([]);
  useEffect(() => {
    if (!buildingId) {
      setWorkers([]);
      return;
    }
    const qy = query(collection(db, "users"), where("role", "==", "employee"));
    const unsub = onSnapshot(qy, (snap) => {
      const arr: Worker[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          name: data.firstName || data.name || data.email || d.id,
          email: data.email,
        };
      });
      setWorkers(arr);
    });
    return () => unsub();
  }, [buildingId]);

  // Subscribe to per-day scheduler templates (read-only)
  useEffect(() => {
    setItemsByDay(makeEmpty());
    setLoadingByDay(makeLoading());
    if (!buildingId) return;

    const unsubs = DAYS.map((day) => {
      const qy = query(
        collection(db, "buildings", buildingId, "scheduler", day, "items"),
        orderBy("order")
      );
      return onSnapshot(
        qy,
        (snap) => {
          setLoadingByDay((prev) => ({ ...prev, [day]: false }));
          const arr = snap.docs.map((d) => {
            const raw = d.data() as any;
            return {
              id: d.id,
              title:
                typeof raw.title === "string" && raw.title.trim()
                  ? raw.title
                  : "Untitled",
              description:
                typeof raw.description === "string" ? raw.description : "",
              defaultPriority:
                typeof raw.defaultPriority === "number" ? raw.defaultPriority : 3,
              roleNeeded: raw.roleNeeded ?? null,
              assignedWorkerIds: Array.isArray(raw.assignedWorkerIds)
                ? raw.assignedWorkerIds
                : [],
              order: typeof raw.order === "number" ? raw.order : 999,
              active: raw.active !== false,
              roomNumber:
                typeof raw.roomNumber === "string" ? raw.roomNumber : null,
            } as TemplateItem;
          });
          setItemsByDay((prev) => ({ ...prev, [day]: arr }));
          originalRef.current = { ...originalRef.current, [day]: deepClone(arr) };
        },
        () => setLoadingByDay((prev) => ({ ...prev, [day]: false }))
      );
    });

    return () => unsubs.forEach((u) => u && u());
  }, [buildingId]);

  const nameById = useMemo(() => {
    const m: Record<string, string> = {};
    workers.forEach((w) => (m[w.id] = w.name));
    return m;
  }, [workers]);

  const selectedListRaw = itemsByDay[selectedDay] ?? [];
  const selectedList = useMemo(() => {
    const seen = new Set<string>();
    return selectedListRaw.filter((it) => {
      if (!it?.id) return false;
      if (seen.has(it.id)) return false;
      seen.add(it.id);
      return true;
    });
  }, [selectedListRaw, selectedDay]);

  const selectedLoading = loadingByDay[selectedDay];

  const prevDay = () => setDayIndex((i) => (i === 0 ? DAYS.length - 1 : i - 1));
  const nextDay = () => setDayIndex((i) => (i === DAYS.length - 1 ? 0 : i + 1));

  const disabledUI = !buildingId;

  const renderRow = ({ item }: { item: TemplateItem }) => {
    const assignedNames =
      (item.assignedWorkerIds || [])
        .map((id) => nameById[id] || id)
        .filter(Boolean)
        .join(", ") || "Unassigned";

    return (
      <View style={styles.card}>
        <Text style={styles.title}>{item.title || "Untitled"}</Text>
        {!!item.description && <Text style={styles.meta}>{item.description}</Text>}
        {!!item.roomNumber && <Text style={styles.meta}>Room: {item.roomNumber}</Text>}
        <Text style={styles.meta}>
          Priority {item.defaultPriority ?? 3}
          {item.roleNeeded ? ` • ${item.roleNeeded}` : ""}
        </Text>
        <Text style={styles.meta}>Assigned: {assignedNames}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header — looks identical; action buttons are disabled */}
        <View style={styles.headerRow}>
          <View style={styles.daySwitcher}>
            <TouchableOpacity onPress={prevDay} style={styles.arrowBtn} disabled={disabledUI}>
              <Ionicons
                name="chevron-back"
                size={18}
                color={isDark ? "#E5E7EB" : "#1F2937"}
              />
            </TouchableOpacity>

            <View style={styles.dayBadge}>
              <Text style={styles.dayLabel}>{DAY_LABEL[selectedDay]}</Text>
            </View>

            <TouchableOpacity onPress={nextDay} style={styles.arrowBtn} disabled={disabledUI}>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={isDark ? "#E5E7EB" : "#1F2937"}
              />
            </TouchableOpacity>
          </View>
         
        </View>

        {/* If no building selected, same nudge */}
        {!buildingId && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
            <View
              style={{
                padding: 12,
                borderRadius: 10,
                backgroundColor: isDark ? "#1F2937" : "#FFF7ED",
                borderWidth: 1,
                borderColor: isDark ? "#334155" : "#FED7AA",
              }}
            >
              <Text style={{ fontWeight: "800", color: isDark ? "#F3F4F6" : "#7C2D12" }}>
                Select a building to view its scheduler
              </Text>
              <Text style={{ marginTop: 4, color: isDark ? "#CBD5E1" : "#7C2D12" }}>
                All templates are scoped per building.
              </Text>
            </View>
          </View>
        )}

        {/* List (read-only, no drag/swipe) */}
        {disabledUI ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Waiting for building…</Text>
          </View>
        ) : selectedLoading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        ) : selectedList.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons
              name="clipboard-outline"
              size={24}
              color={isDark ? "#94A3B8" : "#64748B"}
            />
            <Text style={styles.emptyText}>
              No items for {DAY_LABEL[selectedDay]} yet.
            </Text>
            <Text style={styles.emptySubtle}>Supervisor will add items here.</Text>
          </View>
        ) : (
          <FlatList
            data={selectedList}
            keyExtractor={(it) => it.id}
            renderItem={renderRow}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 96,
            }}
          />
        )}

        {/* Save/Discard bar is intentionally omitted in read-only */}
      </SafeAreaView>
    </View>
  );
}

/* ---------- Styles (copied to match visuals) ---------- */
const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#0B1220" : "#F8FAFC",
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 4,
      gap: 8,
    },
    daySwitcher: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flex: 1,
    },
    arrowBtn: {
      backgroundColor: isDark ? "#111827" : "#E5E7EB",
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    dayBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: isDark ? "#111827" : "#E5E7EB",
      borderRadius: 999,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },
    dayLabel: {
      fontSize: 16,
      fontWeight: "800",
      color: isDark ? "#F3F4F6" : "#111827",
      letterSpacing: 0.2,
    },
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: isDark ? "#2563EB" : "#1D4ED8",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
    },
    addBtnText: { color: "#FFF", fontWeight: "800" },

    rolloutBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#10B981",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
    },
    rolloutText: { color: "#fff", fontWeight: "800" },

    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    loadingText: { marginTop: 8, color: isDark ? "#E5E7EB" : "#111827" },

    emptyWrap: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
      gap: 8,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: "700",
      color: isDark ? "#E5E7EB" : "#111827",
    },
    emptySubtle: {
      fontSize: 13,
      color: isDark ? "#94A3B8" : "#64748B",
    },

    card: {
      height: CARD_HEIGHT,
      width: "100%",
      backgroundColor: isDark ? "#111827" : "#FFFFFF",
      borderRadius: 16,
      padding: 14,
      marginVertical: 8,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },
    title: {
      fontSize: 16,
      fontWeight: "800",
      color: isDark ? "#E5E7EB" : "#0F172A",
      marginBottom: 6,
      letterSpacing: 0.2,
    },
    meta: {
      fontSize: 13,
      color: isDark ? "#CBD5E1" : "#4B5563",
    },
  });
