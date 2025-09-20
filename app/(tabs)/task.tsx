import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
} from "react-native";
import { router } from "expo-router";
import { db, auth } from "../../firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { useUser } from "../UserContext";
import { useTheme } from "../ThemeContext";
import {
  useServerTime,
  priorityWindows,
  PROJECT_WINDOW,
} from "../serverTimeContext";
import { DateTime } from "luxon";
import SwipeableItem, { UnderlayParams } from "react-native-swipeable-item";
import { Ionicons } from "@expo/vector-icons";
import { useBuilding } from "../BuildingContext";

/** ---------- helpers ---------- */
function sortByOrder<T extends { order?: number }>(arr: T[]) {
  return [...arr].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}
function windowLabel(p: number) {
  const w = priorityWindows.find((x) => x.priority === p);
  return w ? `${w.start}–${w.end}` : "";
}
function getActiveWindowEnd(tzNow: DateTime) {
  const w = priorityWindows.find((x) => {
    const [sh, sm] = x.start.split(":").map(Number);
    const [eh, em] = x.end.split(":").map(Number);
    const mins = tzNow.hour * 60 + tzNow.minute;
    const s = sh * 60 + sm;
    const e = eh * 60 + em;
    return mins >= s && mins <= e;
  });
  if (!w) return null;
  const [eh, em] = w.end.split(":").map(Number);
  return tzNow.set({ hour: eh, minute: em, second: 0, millisecond: 0 });
}
function getProjectEnd(tzNow: DateTime) {
  const [eh, em] = PROJECT_WINDOW.end.split(":").map(Number);
  return tzNow.set({ hour: eh, minute: em, second: 0, millisecond: 0 });
}

/** ---------- UI primitives ---------- */
const Chip = ({ text, isDark }: { text: string; isDark: boolean }) => (
  <View
    style={{
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: isDark ? "#111827" : "#EEF2FF",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    }}
  >
    <Text
      style={{
        fontSize: 12,
        fontWeight: "700",
        color: isDark ? "#E5E7EB" : "#1E3A8A",
        letterSpacing: 0.2,
      }}
    >
      {text}
    </Text>
  </View>
);

const SectionToggle = ({
  title,
  open,
  onPress,
  pillText,
  count,
  isDark,
}: {
  title: string;
  open: boolean;
  onPress: () => void;
  pillText?: string;
  count?: number;
  isDark: boolean;
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.88}
    style={{
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 16,
      backgroundColor: isDark ? "#0B1220" : "#FFFFFF",
      borderWidth: 1,
      borderColor: isDark ? "#1F2937" : "#E5E7EB",
      marginBottom: 12,
    }}
  >
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "800",
          color: isDark ? "#F3F4F6" : "#0F172A",
          letterSpacing: 0.2,
        }}
      >
        {title}
      </Text>
      {pillText ? <Chip text={pillText} isDark={isDark} /> : null}
    </View>

    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      {typeof count === "number" && (
        <View
          style={{
            minWidth: 28,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 999,
            backgroundColor: isDark ? "#111827" : "#F1F5F9",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "800",
              color: isDark ? "#E5E7EB" : "#0F172A",
            }}
          >
            {count}
          </Text>
        </View>
      )}
      <Ionicons
        name="chevron-down"
        size={18}
        color={isDark ? "#D1D5DB" : "#475569"}
        style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
      />
    </View>
  </TouchableOpacity>
);

const PriorityToggle = ({
  label,
  open,
  onPress,
  isActiveNow,
  windowLabelText,
  isDark,
  count,
}: {
  label: string;
  open: boolean;
  onPress: () => void;
  isActiveNow?: boolean;
  windowLabelText?: string;
  isDark: boolean;
  count?: number;
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.9}
    style={{
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: isDark ? "#0B1220" : "#F8FAFC",
      borderWidth: 1,
      borderColor: isDark ? "#1E293B" : "#E5E7EB",
      marginVertical: 6,
    }}
  >
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: isActiveNow
            ? "#10B981"
            : isDark
            ? "#374151"
            : "#CBD5E1",
        }}
      />
      <View>
        <Text
          style={{
            fontSize: 15,
            fontWeight: "800",
            color: isDark ? "#E5E7EB" : "#111827",
          }}
        >
          {label}
          {isActiveNow ? " · Now" : ""}
        </Text>
        {!!windowLabelText && (
          <Text
            style={{
              marginTop: 1,
              fontSize: 12,
              fontWeight: "600",
              color: isDark ? "#93A3B3" : "#4B5563",
            }}
          >
            {windowLabelText}
          </Text>
        )}
      </View>
    </View>

    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      {typeof count === "number" && (
        <Text
          style={{
            fontSize: 12,
            fontWeight: "800",
            color: isDark ? "#C7D2FE" : "#1E3A8A",
          }}
        >
          {count}
        </Text>
      )}
      <Ionicons
        name="chevron-down"
        size={18}
        color={isDark ? "#C7D2FE" : "#1E3A8A"}
        style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
      />
    </View>
  </TouchableOpacity>
);

/* =========================================================
   Main Page
   ========================================================= */
function TaskPage() {
  // Manager buckets
  const [MP1, setMP1] = useState<any[]>([]);
  const [MP2, setMP2] = useState<any[]>([]);
  const [MP3, setMP3] = useState<any[]>([]);
  // Employee buckets
  const [EP1, setEP1] = useState<any[]>([]);
  const [EP2, setEP2] = useState<any[]>([]);
  const [EP3, setEP3] = useState<any[]>([]);

  const [currentProjects, setCurrentProjects] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Collapsible
  const [showTasks, setShowTasks] = useState(true);
  const [showP1, setShowP1] = useState(true);
  const [showP2, setShowP2] = useState(true);
  const [showP3, setShowP3] = useState(true);
  const [showProjects, setShowProjects] = useState(true);

  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const s = getStyles(isDark);
  const { role, loading } = useUser();

  const { activePriority, tzNow, nextBoundary, isProjectTime } =
    useServerTime();
  const todayISO = useMemo(() => tzNow().toISODate(), [tzNow]);

  const uid = auth.currentUser?.uid || null;
  const { buildingId } = useBuilding();
  const [buildingName, setBuildingName] = useState<string | null>(null);

  useEffect(() => {
    if (!buildingId) {
      setBuildingName(null);
      return;
    }
    const ref = doc(db, "buildings", buildingId);
    // realtime so if name changes, header updates automatically
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.data() as { name?: string } | undefined;
      setBuildingName(data?.name ?? null);
    });
    return () => unsub();
  }, [buildingId]);

  /** theme crossfade */
  const themeAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(themeAnim, {
      toValue: isDark ? 1 : 0,
      duration: 220,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [isDark]);
  const darkOpacity = themeAnim;

  /** subscriptions: MANAGER */
  useEffect(() => {
    if (!buildingId) {
      setMP1([]);
      setMP2([]);
      setMP3([]);
      setCurrentProjects([]);
      return;
    }
    const tasksRef = collection(db, "buildings", buildingId, "tasks");

    const q1 = query(
      tasksRef,
      where("priority", "==", 1),
      where("forToday", "==", true)
    );
    const q2 = query(
      tasksRef,
      where("priority", "==", 2),
      where("forToday", "==", true)
    );
    const q3 = query(
      tasksRef,
      where("priority", "==", 3),
      where("forToday", "==", true)
    );

    const u1 = onSnapshot(q1, (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setMP1(sortByOrder(items));
    });
    const u2 = onSnapshot(q2, (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setMP2(sortByOrder(items));
    });
    const u3 = onSnapshot(q3, (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setMP3(sortByOrder(items));
    });

    const projectsRef = collection(db, "buildings", buildingId, "projects");
    const projectsQ = query(projectsRef, where("forToday", "==", true));
    const uProj = onSnapshot(projectsQ, (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      items.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
      setCurrentProjects(items);
    });

    return () => {
      u1();
      u2();
      u3();
      uProj();
    };
  }, [buildingId, todayISO]);

  /** subscriptions: EMPLOYEE */
  useEffect(() => {
    if (role !== "employee" || !uid || !buildingId) {
      setEP1([]);
      setEP2([]);
      setEP3([]);
      return;
    }
    const tasksRef = collection(db, "buildings", buildingId, "tasks");
    const subscribeEmployeeBucket = (
      priority: 1 | 2 | 3,
      setBucket: (xs: any[]) => void
    ) => {
      const unsubs: Array<() => void> = [];
      const map = new Map<string, any>();
      const collectAndSet = () =>
        setBucket(sortByOrder(Array.from(map.values())));

      const qAW = query(
        tasksRef,
        where("priority", "==", priority),
        where("forToday", "==", true),
        where("assignedWorkers", "array-contains", uid)
      );
      unsubs.push(
        onSnapshot(qAW, (snap) => {
          map.clear();
          snap.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
          collectAndSet();
        })
      );

      const qAT = query(
        tasksRef,
        where("priority", "==", priority),
        where("forToday", "==", true),
        where("assignedTo", "==", uid)
      );
      unsubs.push(
        onSnapshot(qAT, (snap) => {
          snap.forEach((d) => map.set(d.id, { id: d.id, ...d.data() }));
          collectAndSet();
        })
      );

      return () => unsubs.forEach((u) => u());
    };

    const off1 = subscribeEmployeeBucket(1, setEP1);
    const off2 = subscribeEmployeeBucket(2, setEP2);
    const off3 = subscribeEmployeeBucket(3, setEP3);
    return () => {
      off1?.();
      off2?.();
      off3?.();
    };
  }, [buildingId, todayISO, role, uid]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    const t = setTimeout(() => setIsRefreshing(false), 400);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <View
        style={[
          s.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator />
        <Text style={s.text}>Loading...</Text>
      </View>
    );
  }

  /** navigation */
  const openTaskScreen = useCallback(
    (item: any) => {
      if (role === "manager") {
        console.log("hai");
        return;
      }
      router.push({
        pathname: "/taskClicked",
        params: {
          taskId: item.id,
          taskType: item.taskType,
          taskDescription: item.description,
          taskRoomNumber: item.roomNumber,
          taskPriority: item.priority,
          taskStatus: item.status,
          taskCreatedBy: item.createdBy,
          taskCreatedAt: item.createdAt?.toDate?.().toLocaleString?.(),
          buildingId,
        },
      });
    },
    [buildingId, role]
  );

  const openProjectScreen = useCallback(
    (item: any) => {
      if (role === "manager") {
        console.log("hai");
        return;
      }
      router.push({
        pathname: "/projectClicked",
        params: {
          projectId: item.id,
          title: item.title ?? item.taskType ?? "Project",
          description: item.description ?? "",
          roomNumber: item.roomNumber ?? "",
          status: item.status ?? "pending",
          createdBy: item.createdBy ?? "",
          createdAt: item.createdAt?.toDate?.().toLocaleString?.(),
          buildingId,
        },
      });
    },
    [buildingId, role]
  );

  /** status helpers */
  const isComplete = (item: any) =>
    String(item.status ?? "").toLowerCase() === "completed";
  const hasAssignee = (item: any) => {
    const v = item.assignedWorkers ?? item.assignedTo ?? null;
    if (Array.isArray(v)) return v.length > 0;
    return !!v;
  };
  const getStatusColor = (item: any) => {
    if (isComplete(item)) return "#22C55E";
    if (hasAssignee(item)) return "#EAB308";
    return "#EF4444";
  };
  const formatNextStart = (nb: DateTime | null, now: DateTime) => {
    const prefix = "Next window: ";
    if (!nb) return `${prefix}${priorityWindows[0].start}`;
    if (nb.hasSame(now, "day")) return `${prefix}${nb.toFormat("HH:mm")}`;
    const tomorrow = now.plus({ days: 1 }).startOf("day");
    if (nb.startOf("day").equals(tomorrow))
      return `${prefix}Tomorrow ${nb.toFormat("HH:mm")}`;
    return `${prefix}${nb.toFormat("ccc HH:mm")}`;
  };

  /** delete */
  const confirmDelete = useCallback(
    (id: string, isProject: boolean, close?: () => void) => {
      if (role !== "supervisor") {
        Alert.alert("Not allowed", "Only supervisors can delete items.");
        return;
      }
      if (!buildingId) {
        Alert.alert("Select a building first");
        return;
      }
      const label = isProject ? "project" : "task";
      Alert.alert(
        `Delete this ${label}?`,
        "This cannot be undone.",
        [
          { text: "Cancel", style: "cancel", onPress: () => close?.() },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                const path = isProject ? "projects" : "tasks";
                const ref = doc(db, "buildings", buildingId, path, id);
                await deleteDoc(ref);
              } catch (e: any) {
                Alert.alert(
                  "Error",
                  e?.message || `Failed to delete ${label}.`
                );
              } finally {
                close?.();
              }
            },
          },
        ],
        { cancelable: true }
      );
    },
    [role, buildingId]
  );

  /** pulse for active */
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const glowStyle = useCallback(
    (isActive: boolean) => {
      if (!isActive) return {};
      const intensity = pulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.2, 0.7],
      });
      return {
        borderWidth: 2,
        borderColor: isDark ? "rgba(59,130,246,0.8)" : "rgba(37,99,235,0.9)",
        shadowColor: isDark ? "#60A5FA" : "#3B82F6",
        shadowOpacity: intensity as unknown as number,
        shadowRadius: 12,
        elevation: 8,
      } as any;
    },
    [isDark, pulse]
  );

  /** refined card */
  const renderCard = useCallback(
    (item: any, isProjectItem: boolean = false) => {
      const isActive = isProjectItem
        ? isProjectTime
        : item.priority === activePriority;
      const canDelete = role === "supervisor";
      const statusColor = getStatusColor(item);

      return (
        <View key={item.id} style={s.shadowWrap}>
          <View style={s.rowClip}>
            <SwipeableItem
              item={item}
              snapPointsLeft={canDelete ? [96] : []}
              overSwipe={canDelete ? 32 : 0}
              renderUnderlayLeft={
                canDelete
                  ? ({ close }: UnderlayParams<any>) => (
                      <View style={s.underlayLeft}>
                        <TouchableOpacity
                          onPress={() =>
                            confirmDelete(item.id, isProjectItem, close)
                          }
                          style={s.underlayButton}
                          activeOpacity={0.9}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={28}
                            color="#fff"
                          />
                          <Text style={s.underlayText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    )
                  : undefined
              }
              onChange={
                canDelete
                  ? ({ openDirection }) => {
                      if (openDirection === "left")
                        confirmDelete(item.id, isProjectItem);
                    }
                  : undefined
              }
            >
              <Animated.View style={[s.card, glowStyle(isActive)]}>
                {/* status rail */}
                <View style={s.pillRail}>
                  <View style={[s.pill, { backgroundColor: statusColor }]} />
                </View>

                <TouchableOpacity
                  onPress={() =>
                    isProjectItem
                      ? openProjectScreen(item)
                      : openTaskScreen(item)
                  }
                  activeOpacity={0.86}
                  style={{ flexDirection: "row", alignItems: "center" }}
                >
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <View style={s.titleRow}>
                      <Text numberOfLines={1} style={s.title}>
                        {item.taskType || item.title || "Untitled"}
                      </Text>
                      {isActive && (
                        <View style={s.nowPill}>
                          <Ionicons name="flash" size={12} color="#fff" />
                          <Text style={s.nowPillText}>Now</Text>
                        </View>
                      )}
                    </View>

                    <View style={s.metaRow}>
                      <View style={s.metaItem}>
                        <Ionicons
                          name="business-outline"
                          size={14}
                          color={isDark ? "#A8B1C0" : "#64748B"}
                        />
                        <Text style={s.metaText}>
                          Room {item.roomNumber || "N/A"}
                        </Text>
                      </View>
                      {isProjectItem ? (
                        <View style={s.metaItem}>
                          <Ionicons
                            name="albums-outline"
                            size={14}
                            color={isDark ? "#A8B1C0" : "#64748B"}
                          />
                          <Text style={s.metaText}>Project</Text>
                        </View>
                      ) : (
                        <View style={s.metaItem}>
                          <Ionicons
                            name="flag-outline"
                            size={14}
                            color={isDark ? "#A8B1C0" : "#64748B"}
                          />
                          <Text style={s.metaText}>
                            P{item.priority ?? "–"}
                          </Text>
                        </View>
                      )}
                      {typeof item.estimatedMinutes === "number" && (
                        <View style={s.metaItem}>
                          <Ionicons
                            name="time-outline"
                            size={14}
                            color={isDark ? "#A8B1C0" : "#64748B"}
                          />
                          <Text style={s.metaText}>
                            ~{item.estimatedMinutes}m
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={isDark ? "#94A3B8" : "#64748B"}
                  />
                </TouchableOpacity>
              </Animated.View>
            </SwipeableItem>
          </View>
        </View>
      );
    },
    [
      activePriority,
      isProjectTime,
      role,
      s,
      confirmDelete,
      glowStyle,
      openTaskScreen,
      openProjectScreen,
      isDark,
    ]
  );

  const tz = tzNow();
  const end = getActiveWindowEnd(tz);
  const countdown = end
    ? Math.max(0, Math.floor(end.diff(tz, "minutes").minutes))
    : null;
  const projEnd = getProjectEnd(tz);
  const projCountdown = Math.max(
    0,
    Math.floor(projEnd.diff(tz, "minutes").minutes)
  );

  if (!buildingId) {
    return (
      <SafeAreaView style={s.container}>
        <View style={{ padding: 16 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "800",
              marginBottom: 8,
              color: isDark ? "#E5E7EB" : "#111827",
            }}
          >
            Select a building to see tasks
          </Text>
          <Text style={{ color: isDark ? "#94A3B8" : "#4B5563" }}>
            Tasks are scoped per building. Choose one from the Home screen
            header.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // counts for headers
  const tasksCount =
    role === "supervisor" || role === "manager"
      ? MP1.length + MP2.length + MP3.length
      : EP1.length + EP2.length + EP3.length;

  return (
    <SafeAreaView style={s.container}>
      {/* bg layers */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#F8FAFC" }]} />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "#0F172A", opacity: darkOpacity },
        ]}
      />

      {/* header */}
      <View style={s.headerBar}>
        <View>
          <Text style={s.headerTitle}>Tasks</Text>
          <Text style={s.headerSubtitle}>Building: {buildingName ?? buildingId}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
                   <TouchableOpacity
            onPress={toggleTheme}
            style={s.iconBtn}
            accessibilityLabel="Toggle theme"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isDark ? "sunny-outline" : "moon-outline"}
              size={18}
              color={isDark ? "#FDE68A" : "#111827"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* banner */}
      <View style={s.banner}>
        {activePriority ? (
          <>
            <Text style={s.bannerTitle}>Priority {activePriority} window</Text>
            <Text style={s.bannerSubtitle}>
              {windowLabel(activePriority)}
              {countdown !== null ? ` · ${countdown} min left` : ""}
            </Text>
          </>
        ) : isProjectTime ? (
          <>
            <Text style={s.bannerTitle}>Project time</Text>
            <Text style={s.bannerSubtitle}>
              {`${PROJECT_WINDOW.start}–${PROJECT_WINDOW.end}`}
              {Number.isFinite(projCountdown)
                ? ` · ${projCountdown} min left`
                : ""}
            </Text>
          </>
        ) : (
          <>
            <Text style={s.bannerTitle}>No active window</Text>
            <Text style={s.bannerSubtitle}>
              {formatNextStart(nextBoundary, tzNow())}
            </Text>
          </>
        )}
      </View>

      {/* legend */}
      <View style={s.legendRow}>
        <LegendDot color="#EF4444" />
        <Text style={s.legendText}>Unassigned</Text>
        <LegendDot color="#EAB308" />
        <Text style={s.legendText}>Assigned</Text>
        <LegendDot color="#22C55E" />
        <Text style={s.legendText}>Completed</Text>
      </View>

      {role === "supervisor" || role === "manager" ? (
        <FlatList
          data={[]}
          renderItem={null}
          contentContainerStyle={s.scrollContainer}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          ListHeaderComponent={
            <>
              <SectionToggle
                title="Today’s Tasks"
                pillText="Live"
                open={showTasks}
                onPress={() => setShowTasks(!showTasks)}
                isDark={isDark}
                count={tasksCount}
              />

              {showTasks && (
                <View>
                  <PriorityToggle
                    label="Priority 1"
                    open={showP1}
                    onPress={() => setShowP1(!showP1)}
                    isActiveNow={activePriority === 1}
                    windowLabelText={windowLabel(1)}
                    isDark={isDark}
                    count={MP1.length}
                  />
                  {showP1 &&
                    (MP1.length === 0 ? (
                      <Text style={s.emptyText}>No items for Priority 1.</Text>
                    ) : (
                      MP1.map((item) => renderCard(item))
                    ))}

                  <PriorityToggle
                    label="Priority 2"
                    open={showP2}
                    onPress={() => setShowP2(!showP2)}
                    isActiveNow={activePriority === 2}
                    windowLabelText={windowLabel(2)}
                    isDark={isDark}
                    count={MP2.length}
                  />
                  {showP2 &&
                    (MP2.length === 0 ? (
                      <Text style={s.emptyText}>No items for Priority 2.</Text>
                    ) : (
                      MP2.map((item) => renderCard(item))
                    ))}

                  <PriorityToggle
                    label="Priority 3"
                    open={showP3}
                    onPress={() => setShowP3(!showP3)}
                    isActiveNow={activePriority === 3}
                    windowLabelText={windowLabel(3)}
                    isDark={isDark}
                    count={MP3.length}
                  />
                  {showP3 &&
                    (MP3.length === 0 ? (
                      <Text style={s.emptyText}>No items for Priority 3.</Text>
                    ) : (
                      MP3.map((item) => renderCard(item))
                    ))}
                </View>
              )}

              <SectionToggle
                title="Projects"
                open={showProjects}
                onPress={() => setShowProjects(!showProjects)}
                isDark={isDark}
                count={currentProjects.length}
              />
              {showProjects &&
                (currentProjects.length === 0 ? (
                  <Text style={s.emptyText}>
                    No pending projects available.
                  </Text>
                ) : (
                  currentProjects.map((item) => renderCard(item, true))
                ))}
            </>
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={[]}
          renderItem={null}
          contentContainerStyle={s.scrollContainer}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          ListHeaderComponent={
            <>
              <SectionToggle
                title="My Tasks"
                pillText="Assigned to me"
                open={showTasks}
                onPress={() => setShowTasks(!showTasks)}
                isDark={isDark}
                count={tasksCount}
              />

              {showTasks && (
                <View>
                  <PriorityToggle
                    label="Priority 1"
                    open={showP1}
                    onPress={() => setShowP1(!showP1)}
                    isActiveNow={activePriority === 1}
                    windowLabelText={windowLabel(1)}
                    isDark={isDark}
                    count={EP1.length}
                  />
                  {showP1 &&
                    (EP1.length === 0 ? (
                      <Text style={s.emptyText}>No items for Priority 1.</Text>
                    ) : (
                      EP1.map((item) => renderCard(item))
                    ))}

                  <PriorityToggle
                    label="Priority 2"
                    open={showP2}
                    onPress={() => setShowP2(!showP2)}
                    isActiveNow={activePriority === 2}
                    windowLabelText={windowLabel(2)}
                    isDark={isDark}
                    count={EP2.length}
                  />
                  {showP2 &&
                    (EP2.length === 0 ? (
                      <Text style={s.emptyText}>No items for Priority 2.</Text>
                    ) : (
                      EP2.map((item) => renderCard(item))
                    ))}

                  <PriorityToggle
                    label="Priority 3"
                    open={showP3}
                    onPress={() => setShowP3(!showP3)}
                    isActiveNow={activePriority === 3}
                    windowLabelText={windowLabel(3)}
                    isDark={isDark}
                    count={EP3.length}
                  />
                  {showP3 &&
                    (EP3.length === 0 ? (
                      <Text style={s.emptyText}>No items for Priority 3.</Text>
                    ) : (
                      EP3.map((item) => renderCard(item))
                    ))}
                </View>
              )}
            </>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

export default TaskPage;

/** ---------- tiny legend dot ---------- */
const LegendDot = ({ color }: { color: string }) => (
  <View
    style={{
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: color,
      marginRight: 6,
    }}
  />
);

/* =========================================================
   Styles
   ========================================================= */
const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? "#0F172A" : "#F8FAFC" },

    headerBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? "#1F2937" : "#E5E7EB",
      backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: isDark ? "#F3F4F6" : "#111827",
      letterSpacing: 0.2,
    },
    headerSubtitle: {
      marginTop: 2,
      fontSize: 12,
      color: isDark ? "#94A3B8" : "#64748B",
    },

    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#111827" : "#E5E7EB",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },

    banner: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: isDark ? "#0B1220" : "#E9F2FF",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? "#1F2937" : "#BFDBFE",
    },
    bannerTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: isDark ? "#E5E7EB" : "#0F172A",
    },
    bannerSubtitle: {
      marginTop: 2,
      fontSize: 13,
      color: isDark ? "#CBD5E1" : "#1E40AF",
    },

    legendRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? "#1F2937" : "#E5E7EB",
      backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
    },
    legendText: { fontSize: 12, color: isDark ? "#A8B1C0" : "#64748B" },

    scrollContainer: { padding: 16, paddingBottom: 40 },

    /* Outer shadow container so rowClip can clip without killing shadow */
    shadowWrap: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 6,
      marginBottom: 14, // spacing between rows lives here
    },

    /* Clips the swipe underlay to the row bounds */
    rowClip: {
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: "transparent",
    },

    card: {
      backgroundColor: isDark ? "#0B1220" : "#FFFFFF",
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: isDark ? "#1F2937" : "#E5E7EB",
      position: "relative",
    },

    pillRail: {
      position: "absolute",
      right: 8,
      top: 8,
      bottom: 8,
      width: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    pill: { width: 6, borderRadius: 8, height: "78%" },

    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      marginBottom: 6,
    },
    title: {
      fontSize: 16,
      fontWeight: "800",
      color: isDark ? "#E2E8F0" : "#0F172A",
      letterSpacing: 0.2,
    },

    nowPill: {
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: "#22C55E",
      alignItems: "center",
    },
    nowPillText: {
      color: "#fff",
      fontWeight: "800",
      fontSize: 11,
      letterSpacing: 0.3,
    },

    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginTop: 2,
    },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    metaText: { fontSize: 13, color: isDark ? "#CBD5E1" : "#334155" },

    emptyText: {
      fontSize: 15,
      textAlign: "center",
      marginTop: 14,
      marginBottom: 14,
      color: isDark ? "#9CA3AF" : "#6B7280",
    },
    text: { color: isDark ? "#E5E7EB" : "#111" },

    underlayLeft: {
      flex: 1,
      backgroundColor: "#EF4444",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    underlayButton: {
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    },
    underlayText: { marginTop: 6, color: "#fff", fontWeight: "700" },
  });
