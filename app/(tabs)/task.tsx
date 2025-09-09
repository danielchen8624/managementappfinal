import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
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
  orderBy,
} from "firebase/firestore";
import { useUser } from "../UserContext";
import { useTheme } from "../ThemeContext";
import { useServerTime, priorityWindows, PROJECT_WINDOW } from "../serverTimeContext";
import { DateTime } from "luxon";
import SwipeableItem, { UnderlayParams } from "react-native-swipeable-item";
import { Ionicons } from "@expo/vector-icons";

// 🔑 use the global building selection
import { useBuilding } from "../BuildingContext";

/** Helper to sort by optional `order` field */
function sortByOrder<T extends { order?: number }>(arr: T[]) {
  return [...arr].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

/* ---------- window helpers ---------- */
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
// NEW: project window end helper
function getProjectEnd(tzNow: DateTime) {
  const [eh, em] = PROJECT_WINDOW.end.split(":").map(Number);
  return tzNow.set({ hour: eh, minute: em, second: 0, millisecond: 0 });
}

/* =========================================================
   Clean, on-theme toggles
   ========================================================= */
const SectionToggle = ({
  title,
  open,
  onPress,
  pillText,
  isDark,
}: {
  title: string;
  open: boolean;
  onPress: () => void;
  pillText?: string;
  isDark: boolean;
}) => {
  return (
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
        backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? "#111827" : "transparent",
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 6,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
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
        {pillText ? (
          <View
            style={{
              marginLeft: 10,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: isDark ? "#111827" : "#F3F4F6",
              borderWidth: isDark ? 1 : 0,
              borderColor: isDark ? "#1F2937" : "transparent",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: isDark ? "#E5E7EB" : "#111827",
              }}
            >
              {pillText}
            </Text>
          </View>
        ) : null}
      </View>

      <Ionicons
        name="chevron-down"
        size={20}
        color={isDark ? "#D1D5DB" : "#4B5563"}
        style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
      />
    </TouchableOpacity>
  );
};

const PriorityToggle = ({
  label,
  open,
  onPress,
  isActiveNow,
  windowLabelText,
  isDark,
}: {
  label: string;
  open: boolean;
  onPress: () => void;
  isActiveNow?: boolean;
  windowLabelText?: string;
  isDark: boolean;
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
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

      <Ionicons
        name="chevron-down"
        size={18}
        color={isDark ? "#C7D2FE" : "#1E3A8A"}
        style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
      />
    </TouchableOpacity>
  );
};

/* =========================================================
   Main Page
   ========================================================= */
function TaskPage() {
  // Manager buckets
  const [MP1, setMP1] = useState<any[]>([]);
  const [MP2, setMP2] = useState<any[]>([]);
  const [MP3, setMP3] = useState<any[]>([]);

  // Employee buckets (only tasks assigned to current user)
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
  const styles = getStyles(isDark);
  const { role, loading } = useUser();

  const { activePriority, tzNow, nextBoundary, isProjectTime } = useServerTime();
  const todayISO = useMemo(() => tzNow().toISODate(), [tzNow]);

  const uid = auth.currentUser?.uid || null;

  // 🌆 current building
  const { buildingId } = useBuilding();

  /* ---------- theme crossfade ---------- */
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

  /* ---------- data subscriptions: MANAGER (see all in this building) ---------- */
  useEffect(() => {
    if (!buildingId) {
      setMP1([]); setMP2([]); setMP3([]); setCurrentProjects([]);
      return;
    }

    // Build refs here to avoid identity churn across renders
    const tasksRef = collection(db, "buildings", buildingId, "tasks");

    const q1 = query(tasksRef, where("priority", "==", 1), where("forToday", "==", true));
    const q2 = query(tasksRef, where("priority", "==", 2), where("forToday", "==", true));
    const q3 = query(tasksRef, where("priority", "==", 3), where("forToday", "==", true));

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

    // Projects (MANAGER): show all projects where forToday is true
    const projectsRef = collection(db, "buildings", buildingId, "projects");
    const projectsQ = query(projectsRef, where("forToday", "==", true));
    const uProj = onSnapshot(projectsQ, (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      items.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
      setCurrentProjects(items);
    });

    return () => {
      u1(); u2(); u3(); uProj();
    };
  }, [buildingId, todayISO]);

  /* ---------- data subscriptions: EMPLOYEE (assigned only, in this building) ---------- */
  useEffect(() => {
    if (role !== "employee" || !uid || !buildingId) {
      setEP1([]); setEP2([]); setEP3([]);
      return;
    }

    const tasksRef = collection(db, "buildings", buildingId, "tasks");

    const subscribeEmployeeBucket = (
      priority: 1 | 2 | 3,
      setBucket: (xs: any[]) => void
    ) => {
      const unsubs: Array<() => void> = [];
      const map = new Map<string, any>();

      const collectAndSet = () => {
        setBucket(sortByOrder(Array.from(map.values())));
      };

      // assignedWorkers array-contains uid
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

      // assignedTo == uid (kept for backward compatibility)
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
      off1?.(); off2?.(); off3?.();
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
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator />
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  const openScreen = useCallback((item: any) => {
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
  }, [buildingId]);

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
    if (nb.startOf("day").equals(tomorrow)) {
      return `${prefix}Tomorrow ${nb.toFormat("HH:mm")}`;
    }
    return `${prefix}${nb.toFormat("ccc HH:mm")}`;
  };

  // Manager-only delete UI + guard. Employees can't even trigger it.
  const confirmDeleteTask = useCallback((id: string, close?: () => void) => {
    if (role !== "manager") {
      Alert.alert("Not allowed", "Only managers can delete tasks.");
      return;
    }
    if (!buildingId) {
      Alert.alert("Select a building first");
      return;
    }
    Alert.alert(
      "Delete this task?",
      "This cannot be undone.",
      [
        { text: "Cancel", style: "cancel", onPress: () => close?.() },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const ref = doc(db, "buildings", buildingId, "tasks", id);
              await deleteDoc(ref);
            } catch (e: any) {
              Alert.alert("Error", e?.message || "Failed to delete task.");
            } finally {
              close?.();
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [role, buildingId]);

  // pulse for active tasks/projects
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const glowStyle = useCallback((isActive: boolean) => {
    if (!isActive) return {};
    const intensity = pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.2, 0.65],
    });
    return {
      borderWidth: 2,
      borderColor: isDark ? "rgba(59,130,246,0.8)" : "rgba(37,99,235,0.9)",
      shadowColor: isDark ? "#60A5FA" : "#3B82F6",
      shadowOpacity: intensity as unknown as number,
      shadowRadius: 12,
      elevation: 8,
    } as any;
  }, [isDark, pulse]);

  // UPDATED: allow marking project cards as active during project time
  const renderCard = useCallback((item: any, isProjectItem: boolean = false) => {
    const isActive = isProjectItem ? isProjectTime : item.priority === activePriority;
    const canDelete = role === "manager";

    return (
      <SwipeableItem
        key={item.id}
        item={item}
        snapPointsLeft={canDelete ? [96] : []}
        overSwipe={canDelete ? 32 : 0}
        renderUnderlayLeft={
          canDelete
            ? ({ close }: UnderlayParams<any>) => (
                <View style={styles.underlayLeft}>
                  <TouchableOpacity
                    onPress={() => confirmDeleteTask(item.id, close)}
                    style={styles.underlayButton}
                    activeOpacity={0.9}
                  >
                    <Ionicons name="trash-outline" size={28} color="#fff" />
                    <Text style={styles.underlayText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )
            : undefined
        }
        onChange={
          canDelete
            ? ({ openDirection }) => {
                if (openDirection === "left") confirmDeleteTask(item.id);
              }
            : undefined
        }
      >
        <Animated.View style={[styles.taskCard, glowStyle(isActive)]}>
          <TouchableOpacity onPress={() => openScreen(item)} activeOpacity={0.86}>
            <View style={{ paddingRight: 14 }}>
              <View style={styles.titleRow}>
                <Text style={styles.taskTitle}>
                  {item.taskType || item.title || "Untitled"}
                </Text>
                {isActive && (
                  <View style={styles.nowPill}>
                    <Ionicons name="flash" size={14} color="#fff" />
                    <Text style={styles.nowPillText}>Now</Text>
                  </View>
                )}
              </View>
              <Text style={styles.taskText}>Room: {item.roomNumber || "N/A"}</Text>
              <Text style={styles.taskText}>
                {isProjectItem ? "Project" : `Priority: ${item.priority ?? "Unassigned"}`}
              </Text>
              {typeof item.estimatedMinutes === "number" && (
                <Text style={styles.taskSubtle}>ETA: ~{item.estimatedMinutes} min</Text>
              )}
            </View>
            <View style={styles.pillRail}>
              <View style={[styles.pill, { backgroundColor: getStatusColor(item) }]} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </SwipeableItem>
    );
  }, [activePriority, isProjectTime, role, styles, confirmDeleteTask, glowStyle, openScreen]);

  const openHistory = useCallback(() => router.push("/completedTasks"), []);

  const tz = tzNow();
  const end = getActiveWindowEnd(tz);
  const countdown = end
    ? Math.max(0, Math.floor(end.diff(tz, "minutes").minutes))
    : null;

  // NEW: project countdown
  const projEnd = getProjectEnd(tz);
  const projCountdown = Math.max(0, Math.floor(projEnd.diff(tz, "minutes").minutes));

  // If no building selected, gently nudge
  if (!buildingId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 8, color: isDark ? "#E5E7EB" : "#111827" }}>
            Select a building to see tasks
          </Text>
          <Text style={{ color: isDark ? "#94A3B8" : "#4B5563" }}>
            Tasks are scoped per building. Choose one from the Home screen header.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* background layers */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#F8FAFC" }]} />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "#0F172A", opacity: darkOpacity },
        ]}
      />

      {/* Header bar with history + theme */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Tasks</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity
            onPress={openHistory}
            style={styles.smallGreyBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="time-outline"
              size={18}
              color={isDark ? "#E5E7EB" : "#111827"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleTheme}
            style={styles.smallGreyBtn}
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

      {/* current window banner */}
      <View style={styles.banner}>
        {activePriority ? (
          <>
            <Text style={styles.bannerTitle}>Priority {activePriority} window</Text>
            <Text style={styles.bannerSubtitle}>
              {windowLabel(activePriority)}
              {countdown !== null ? `  ·  ${countdown} min left` : ""}
            </Text>
          </>
        ) : isProjectTime ? (
          <>
            <Text style={styles.bannerTitle}>Project time</Text>
            <Text style={styles.bannerSubtitle}>
              {`${PROJECT_WINDOW.start}–${PROJECT_WINDOW.end}`}
              {Number.isFinite(projCountdown) ? `  ·  ${projCountdown} min left` : ""}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.bannerTitle}>No active window</Text>
            <Text style={styles.bannerSubtitle}>
              {formatNextStart(nextBoundary, tzNow())}
            </Text>
          </>
        )}
      </View>

      {role === "manager" ? (
        // ========================= MANAGER VIEW (MP buckets) =========================
        <FlatList
          data={[]} // we render via ListHeaderComponent
          renderItem={null}
          contentContainerStyle={styles.scrollContainer}
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
                  />
                  {showP1 &&
                    (MP1.length === 0 ? (
                      <Text style={styles.emptyText}>No items for Priority 1.</Text>
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
                  />
                  {showP2 &&
                    (MP2.length === 0 ? (
                      <Text style={styles.emptyText}>No items for Priority 2.</Text>
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
                  />
                  {showP3 &&
                    (MP3.length === 0 ? (
                      <Text style={styles.emptyText}>No items for Priority 3.</Text>
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
              />
              {showProjects &&
                (currentProjects.length === 0 ? (
                  <Text style={styles.emptyText}>No pending projects available.</Text>
                ) : (
                  currentProjects.map((item) => renderCard(item, true))
                ))}
            </>
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        // ========================= EMPLOYEE VIEW (EP buckets) =========================
        <FlatList
          data={[]} // we render via ListHeaderComponent
          renderItem={null}
          contentContainerStyle={styles.scrollContainer}
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
                  />
                  {showP1 &&
                    (EP1.length === 0 ? (
                      <Text style={styles.emptyText}>No items for Priority 1.</Text>
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
                  />
                  {showP2 &&
                    (EP2.length === 0 ? (
                      <Text style={styles.emptyText}>No items for Priority 2.</Text>
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
                  />
                  {showP3 &&
                    (EP3.length === 0 ? (
                      <Text style={styles.emptyText}>No items for Priority 3.</Text>
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

/* =========================================================
   Styles
   ========================================================= */
const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
    },
    headerBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: isDark ? "#F3F4F6" : "#111827",
      letterSpacing: 0.2,
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
    scrollContainer: {
      padding: 16,
      paddingBottom: 40,
    },
    banner: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: isDark ? "#1E293B" : "#E0ECFF",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? "#334155" : "#BFDBFE",
    },
    bannerTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: isDark ? "#E5E7EB" : "#0F172A",
    },
    bannerSubtitle: {
      marginTop: 2,
      fontSize: 13,
      color: isDark ? "#CBD5E1" : "#1E40AF",
    },
    taskCard: {
      backgroundColor: isDark ? "#111827" : "#FFFFFF",
      borderRadius: 16,
      padding: 20,
      paddingRight: 28,
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 6,
      position: "relative",
      overflow: "hidden",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },
    pillRail: {
      position: "absolute",
      right: 8,
      top: 8,
      bottom: 8,
      width: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    pill: {
      width: 8,
      borderRadius: 8,
      height: "80%",
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      marginBottom: 4,
    },
    nowPill: {
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: "#22C55E",
      alignItems: "center",
    },
    nowPillText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 12,
      letterSpacing: 0.3,
    },
    taskTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: isDark ? "#E2E8F0" : "#0F172A",
    },
    taskText: {
      fontSize: 14,
      color: isDark ? "#CBD5E1" : "#334155",
      marginTop: 2,
    },
    taskSubtle: {
      fontSize: 12,
      color: isDark ? "#94A3B8" : "#64748B",
      marginTop: 2,
    },
    emptyText: {
      fontSize: 16,
      textAlign: "center",
      marginTop: 16,
      marginBottom: 16,
      color: isDark ? "#9CA3AF" : "#777",
    },
    text: {
      color: isDark ? "#E5E7EB" : "#111",
    },

    /* Underlay only behind the row (not full page) */
    underlayLeft: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "#EF4444",
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    underlayButton: {
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    },
    underlayText: {
      marginTop: 6,
      color: "#fff",
      fontWeight: "700",
    },
  });
