import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Animated, // NEW
  Easing,   // NEW
} from "react-native";
import { router } from "expo-router";
import { db } from "../../firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  deleteDoc,
  // orderBy, // optional: uncomment if you have an index on "order"
} from "firebase/firestore";
import React, { useMemo, useRef, useState, useEffect } from "react";
import { useUser } from "../UserContext";
import { useTheme } from "../ThemeContext";
// NEW: server-authoritative time + schedule
import { useServerTime, priorityWindows } from "../serverTimeContext";
// NEW: luxon for countdown labels (already used in ServerTimeContext)
import { DateTime } from "luxon";

// same swipe lib you’re using in scheduler
import SwipeableItem, { UnderlayParams } from "react-native-swipeable-item";
import { Ionicons } from "@expo/vector-icons";

/** Helper to sort by optional `order` field */
function sortByOrder<T extends { order?: number }>(arr: T[]) {
  return [...arr].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

// NEW: compute nice human label for a window
function windowLabel(p: number) {
  const w = priorityWindows.find((x) => x.priority === p);
  return w ? `${w.start}–${w.end}` : "";
}

// NEW: get end DateTime of active window, for countdown
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

function TaskPage() {
  // Buckets for tasks grouped by priority (instances only)
  const [p1, setP1] = useState<any[]>([]);
  const [p2, setP2] = useState<any[]>([]);
  const [p3, setP3] = useState<any[]>([]);

  // Projects (unchanged)
  const [currentProjects, setCurrentProjects] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Collapsible sections
  const [showTasks, setShowTasks] = useState(true);
  const [showP1, setShowP1] = useState(true);
  const [showP2, setShowP2] = useState(true);
  const [showP3, setShowP3] = useState(true);
  const [showProjects, setShowProjects] = useState(true);

  const { theme } = useTheme();
  const isDark = theme === "dark";
  const styles = getStyles(isDark);
  const { role, loading } = useUser();

  // NEW: server-authoritative time context
  const { activePriority, tzNow } = useServerTime();

  // NEW: compute today (if you later add taskDate filter)
  const todayISO = useMemo(() => tzNow().toISODate(), [tzNow]);

  useEffect(() => {
    // Only read from `tasks`. We assume the collection already contains just today's items.
    // If/when you add a `taskDate` string (YYYY-MM-DD), add where("taskDate","==",todayISO).
    const statuses = ["pending", "assigned", "in_progress"];

    const q1 = query(
      collection(db, "tasks"),
      where("priority", "==", 1),
      where("status", "in", statuses)
      // where("taskDate", "==", todayISO) // NEW: optional if you store dates
      // orderBy("order") // optional if you have an index
    );
    const q2 = query(
      collection(db, "tasks"),
      where("priority", "==", 2),
      where("status", "in", statuses)
      // where("taskDate", "==", todayISO) // NEW: optional
      // orderBy("order")
    );
    const q3 = query(
      collection(db, "tasks"),
      where("priority", "==", 3),
      where("status", "in", statuses)
      // where("taskDate", "==", todayISO) // NEW: optional
      // orderBy("order")
    );

    const u1 = onSnapshot(q1, (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setP1(sortByOrder(items));
    });
    const u2 = onSnapshot(q2, (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setP2(sortByOrder(items));
    });
    const u3 = onSnapshot(q3, (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setP3(sortByOrder(items));
    });

    // Projects (unchanged)
    const projectsQ = query(collection(db, "projects"), where("status", "==", "pending"));
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
    // NEW: todayISO in deps only if you add the taskDate filter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [/* todayISO */]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 400);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator />
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  const openScreen = (item: any) => {
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
      },
    });
  };

  // status helpers
  const isComplete = (item: any) => String(item.status ?? "").toLowerCase() === "completed";
  const hasAssignee = (item: any) => {
    const v = item.assignedWorkers ?? item.assignedTo ?? null;
    if (Array.isArray(v)) return v.length > 0;
    return !!v;
  };
  const getStatusColor = (item: any) => {
    if (isComplete(item)) return "#22C55E"; // green
    if (hasAssignee(item)) return "#EAB308"; // yellow
    return "#EF4444"; // red
  };

  const confirmDeleteTask = (id: string, close?: () => void) => {
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
              await deleteDoc(doc(db, "tasks", id));
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
  };

  // NEW: animated pulse for active tasks
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ])
    ).start();
  }, [pulse]);

  // NEW: glow styles derived from pulse
  const glowStyle = (isActive: boolean) => {
    if (!isActive) return {};
    const intensity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.65] });
    return {
      borderWidth: 2,
      borderColor: isDark ? "rgba(59,130,246,0.8)" : "rgba(37,99,235,0.9)",
      shadowColor: isDark ? "#60A5FA" : "#3B82F6",
      shadowOpacity: intensity as unknown as number,
      shadowRadius: 12,
      elevation: 8,
    } as any;
  };

  const renderCard = (item: any) => {
    const isActive = item.priority === activePriority; // NEW
    return (
      <SwipeableItem
        key={item.id}
        item={item}
        snapPointsLeft={[96]}       // swipe LEFT to reveal delete
        overSwipe={32}
        renderUnderlayLeft={({ close }: UnderlayParams<any>) => (
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
        )}
        onChange={({ openDirection }) => {
          if (openDirection === "left") {
            confirmDeleteTask(item.id);
          }
        }}
      >
        <Animated.View style={[styles.taskCard, glowStyle(isActive)] /* NEW */}>
          <TouchableOpacity onPress={() => openScreen(item)} activeOpacity={0.86}>
            <View style={{ paddingRight: 14 }}>
              <View style={styles.titleRow /* NEW */}>
                <Text style={styles.taskTitle}>{item.taskType || item.title || "Untitled"}</Text>
                {isActive && (
                  <View style={styles.nowPill /* NEW */}>
                    <Ionicons name="flash" size={14} color="#fff" />
                    <Text style={styles.nowPillText}>Now</Text>
                  </View>
                )}
              </View>
              <Text style={styles.taskText}>Room: {item.roomNumber || "N/A"}</Text>
              <Text style={styles.taskText}>Priority: {item.priority ?? "Unassigned"}</Text>
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
  };

  const openHistory = () => router.push("/completedTasks");

  // NEW: top banner (“Now” and countdown)
  const tz = tzNow();
  const end = getActiveWindowEnd(tz);
  const countdown =
    end ? Math.max(0, Math.floor(end.diff(tz, "minutes").minutes)) : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* NEW: Current window banner */}
      <View style={styles.banner /* NEW */}>
        {activePriority ? (
          <>
            <Text style={styles.bannerTitle /* NEW */}>
              Priority {activePriority} window
            </Text>
            <Text style={styles.bannerSubtitle /* NEW */}>
              {windowLabel(activePriority)}
              {countdown !== null ? `  ·  ${countdown} min left` : ""}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.bannerTitle}>No active window</Text>
            <Text style={styles.bannerSubtitle}>
              Next starts at {priorityWindows[0].start}
            </Text>
          </>
        )}
      </View>

      {role === "manager" ? (
        <>
          <TouchableOpacity onPress={openHistory} style={styles.historyButton}>
            <Text style={styles.historyButtonText}>Task History</Text>
          </TouchableOpacity>

          <FlatList
            data={[]}
            renderItem={() => null}
            keyExtractor={() => Math.random().toString()}
            contentContainerStyle={styles.scrollContainer}
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            ListHeaderComponent={
              <>
                {/* Header */}
                <TouchableOpacity onPress={() => setShowTasks(!showTasks)} style={styles.header}>
                  <Text style={styles.headerText}>
                    Today&apos;s Tasks {showTasks ? "▲" : "▼"}
                  </Text>
                </TouchableOpacity>

                {showTasks && (
                  <View>
                    {/* Priority 1 */}
                    <TouchableOpacity onPress={() => setShowP1(!showP1)} style={styles.subHeader}>
                      <Text style={styles.subHeaderText}>
                        Priority 1 {windowLabel(1)}
                        {activePriority === 1 ? "  ·  Now" : ""}
                        {showP1 ? "  ▲" : "  ▼"}
                      </Text>
                    </TouchableOpacity>
                    {showP1 && (p1.length === 0 ? (
                      <Text style={styles.emptyText}>No items for Priority 1.</Text>
                    ) : (
                      p1.map((item) => renderCard(item))
                    ))}

                    {/* Priority 2 */}
                    <TouchableOpacity onPress={() => setShowP2(!showP2)} style={styles.subHeader}>
                      <Text style={styles.subHeaderText}>
                        Priority 2 {windowLabel(2)}
                        {activePriority === 2 ? "  ·  Now" : ""}
                        {showP2 ? "  ▲" : "  ▼"}
                      </Text>
                    </TouchableOpacity>
                    {showP2 && (p2.length === 0 ? (
                      <Text style={styles.emptyText}>No items for Priority 2.</Text>
                    ) : (
                      p2.map((item) => renderCard(item))
                    ))}

                    {/* Priority 3 */}
                    <TouchableOpacity onPress={() => setShowP3(!showP3)} style={styles.subHeader}>
                      <Text style={styles.subHeaderText}>
                        Priority 3 {windowLabel(3)}
                        {activePriority === 3 ? "  ·  Now" : ""}
                        {showP3 ? "  ▲" : "  ▼"}
                      </Text>
                    </TouchableOpacity>
                    {showP3 && (p3.length === 0 ? (
                      <Text style={styles.emptyText}>No items for Priority 3.</Text>
                    ) : (
                      p3.map((item) => renderCard(item))
                    ))}
                  </View>
                )}

                {/* Projects */}
                <TouchableOpacity onPress={() => setShowProjects(!showProjects)} style={styles.header}>
                  <Text style={styles.headerText}>Projects {showProjects ? "▲" : "▼"}</Text>
                </TouchableOpacity>
                {showProjects &&
                  (currentProjects.length === 0 ? (
                    <Text style={styles.emptyText}>No pending projects available.</Text>
                  ) : (
                    currentProjects.map((item) => renderCard(item))
                  ))}
              </>
            }
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <View style={{ padding: 16 }}>
          <Text style={styles.text}>Employee view goes here</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

export default TaskPage;

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#0F172A" : "#F8FAFC", // NEW: slightly deeper dark bg
    },
    scrollContainer: {
      padding: 16,
      paddingBottom: 40,
    },

    // NEW: top banner
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

    header: {
      width: "100%",
      paddingVertical: 16,
      paddingHorizontal: 20,
      marginBottom: 8,
      backgroundColor: isDark ? "#3B82F6" : "#2563EB",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    headerText: {
      fontSize: 20,
      fontWeight: "700",
      color: "#FFFFFF",
      letterSpacing: 0.3,
    },
    subHeader: {
      marginTop: 4,
      marginBottom: 4,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: isDark ? "#1D4ED8" : "#3B82F6",
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 3,
    },
    subHeaderText: {
      fontSize: 18,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    historyButton: {
      backgroundColor: isDark ? "#1D4ED8" : "#007AFF",
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignSelf: "center",
      marginVertical: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    historyButtonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "600",
    },

    taskCard: {
      backgroundColor: isDark ? "#111827" : "#FFFFFF", // NEW: a bit darker card in dark mode
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
    },

    // Right-side rail that holds the status pill
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

    // NEW: title row and "Now" pill
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
      fontWeight: "700", // NEW: slightly bolder
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

    /* Swipe underlay (left) */
    underlayLeft: {
      flex: 1,
      marginVertical: 8,
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: "#EF4444",
      justifyContent: "center",
      alignItems: "center",
    },
    underlayButton: {
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      width: "100%",
      height: "100%",
    },
    underlayText: {
      marginTop: 6,
      color: "#fff",
      fontWeight: "700",
    },
  });
