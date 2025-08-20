import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { db } from "../../firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy, // NEW: needed to sort template items by `order`
} from "firebase/firestore";
import React, { useState, useEffect, useMemo } from "react";
import { useUser } from "../UserContext";
import { useTheme } from "../ThemeContext";

// ============================
// NEW: Helpers to derive "today"
// ============================
// Before: The page subscribed to *all* pending tasks grouped by priority,
// ignoring the current weekday/date. This made the list the same every day.
// Why: We want the page to automatically display *today's* plan/tasks,
// falling back to the weekday template when no instances exist.

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri"; // NEW: type-safe weekday keys

// NEW: map JS weekday -> our DayKey (Sun=0..Sat=6; only Mon–Fri map to keys)
const DAY_FROM_JS: Record<number, DayKey | null> = {
  0: null,
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: null,
};

// NEW: friendly labels used in the UI
const DAY_LABEL: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
};

// NEW: build a YYYY-MM-DD key for daily instances in /tasks
function localDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// NEW: which weekday is today (Mon–Fri) or null for weekends
function todayDayKey(): DayKey | null {
  const idx = new Date().getDay(); // Sun..Sat
  return DAY_FROM_JS[idx];
}

// NEW: stable ordering helper (template items and/or instances that carry `order`)
function sortByOrder<T extends { order?: number }>(arr: T[]) {
  return [...arr].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

function TaskPage() {
  // NEW: separate buckets for "instances" (concrete tasks for today)
  // and "templates" (weekday defaults), still grouped by priority
  const [instP1, setInstP1] = useState<any[]>([]); // NEW
  const [instP2, setInstP2] = useState<any[]>([]); // NEW
  const [instP3, setInstP3] = useState<any[]>([]); // NEW
  const [tplP1, setTplP1] = useState<any[]>([]);  // NEW
  const [tplP2, setTplP2] = useState<any[]>([]);  // NEW
  const [tplP3, setTplP3] = useState<any[]>([]);  // NEW

  // (unchanged) projects section
  const [currentProjects, setCurrentProjects] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // (unchanged) dropdown toggles
  const [showTasks, setShowTasks] = useState(true);
  const [showP1, setShowP1] = useState(true);
  const [showP2, setShowP2] = useState(true);
  const [showP3, setShowP3] = useState(true);
  const [showProjects, setShowProjects] = useState(true);

  const { theme } = useTheme();
  const isDark = theme === "dark";
  const styles = getStyles(isDark);
  const { role, loading } = useUser();

  // NEW: compute the date key and weekday once at mount
  const dateKey = useMemo(localDateKey, []);   // NEW
  const dayKey = useMemo(todayDayKey, []);     // NEW
  const dayLabel = dayKey ? DAY_LABEL[dayKey] : "Today"; // NEW

  useEffect(() => {
    // ================================================
    // NEW: 1) Subscribe to *today's* task instances
    // ================================================
    // Before: queries looked like: where("status","==","pending") + where("priority","==",X)
    // Why: we now filter by `scheduledDateKey == YYYY-MM-DD` to show only today's items.
    // Also, we include statuses ["pending","assigned","in_progress"].

    const statusList = ["pending", "assigned", "in_progress"]; // NEW

    const q1 = query(
      collection(db, "tasks"),
      where("scheduledDateKey", "==", dateKey), // NEW: today's instances
      where("priority", "==", 1),
      where("status", "in", statusList)
      // NEW: You *can* add orderBy("order") if your instances carry `order` and you have an index.
      // We keep it commented out to avoid index errors:
      // orderBy("order")
    );
    const q2 = query(
      collection(db, "tasks"),
      where("scheduledDateKey", "==", dateKey), // NEW
      where("priority", "==", 2),
      where("status", "in", statusList)
      // orderBy("order")
    );
    const q3 = query(
      collection(db, "tasks"),
      where("scheduledDateKey", "==", dateKey), // NEW
      where("priority", "==", 3),
      where("status", "in", statusList)
      // orderBy("order")
    );

    const u1 = onSnapshot(q1, (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setInstP1(sortByOrder(items)); // NEW: sort by order if present
    });
    const u2 = onSnapshot(q2, (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setInstP2(sortByOrder(items)); // NEW
    });
    const u3 = onSnapshot(q3, (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setInstP3(sortByOrder(items)); // NEW
    });

    // ===================================================
    // NEW: 2) Fallback subscribe to weekday *template*
    // ===================================================
    // Before: there was no weekday template fallback.
    // Why: When a daily generator hasn't produced today's instances,
    // we still want to show the manager's Mon–Fri plan.

    let uTpl: (() => void) | null = null;
    if (dayKey) {
      const qTpl = query(
        collection(db, "scheduler", dayKey, "items"),
        orderBy("order") // NEW: templates should already be ordered
      );
      uTpl = onSnapshot(qTpl, (snap) => {
        const all: any[] = [];
        snap.forEach((d) => all.push({ id: d.id, ...d.data() }));
        const p1 = all.filter((x) => (x.defaultPriority ?? 3) === 1);
        const p2 = all.filter((x) => (x.defaultPriority ?? 3) === 2);
        const p3 = all.filter((x) => (x.defaultPriority ?? 3) === 3);
        setTplP1(sortByOrder(p1).map(tplToDisplayShape)); // NEW: normalize to instance-like shape
        setTplP2(sortByOrder(p2).map(tplToDisplayShape)); // NEW
        setTplP3(sortByOrder(p3).map(tplToDisplayShape)); // NEW
      });
    }

    // (unchanged) projects remain as before
    const projectsQ = query(
      collection(db, "projects"),
      where("status", "==", "pending")
    );
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
      if (uTpl) uTpl();
    };
  }, [dateKey, dayKey]); // NEW: re-run if the day/date changes (e.g., next day)

  // ==========================================
  // NEW: Decide whether to show instances or template
  // ==========================================
  // Before: always showed "pending tasks" regardless of date.
  // Why: We want to show today's instances *if present*, else fall back to template.
  const useTemplate =
    instP1.length + instP2.length + instP3.length === 0; // NEW

  const displayP1 = useTemplate ? tplP1 : instP1; // NEW
  const displayP2 = useTemplate ? tplP2 : instP2; // NEW
  const displayP3 = useTemplate ? tplP3 : instP3; // NEW

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

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

  const openScreen = (item: any) => {
    router.push({
      pathname: "/taskClicked",
      params: {
        taskId: item.id,
        taskType: item.taskType,
        taskDescription: item.description,
        taskRoomNumber: item.roomNumber,
        // NEW: priority fallback — Before: you rendered "Grade".
        // Why: to unify vocabulary with scheduler + tasks (priority).
        taskPriority: item.priority,
        taskStatus: item.status,
        taskCreatedBy: item.createdBy,
        taskCreatedAt: item.createdAt?.toDate?.().toLocaleString?.(),
      },
    });
  };

  // ---------- status helpers (kept, with tiny tweaks) ----------
  const isComplete = (item: any) => {
    const s = String(item.status ?? "").toLowerCase();
    return s === "completed";
  };

  const hasAssignee = (item: any) => {
    // NEW: also checks `assignedTo` (some apps use that field)
    const v = item.assignedWorkers ?? item.assignedTo ?? null;
    if (Array.isArray(v)) return v.length > 0;
    return !!v;
  };

  const getStatusColor = (item: any) => {
    if (isComplete(item)) return "#22C55E"; // green
    if (hasAssignee(item)) return "#EAB308"; // yellow
    return "#EF4444"; // red
  };
  // -------------------------------------------------------------

  const renderCard = (item: any) => (
    <TouchableOpacity
      key={item.id}
      onPress={() => openScreen(item)}
      style={styles.taskCard}
      activeOpacity={0.8}
    >
      <View style={{ paddingRight: 14 }}>
        <Text style={styles.taskTitle}>
          {item.taskType || item.title || "Untitled"}
        </Text>
        <Text style={styles.taskText}>Room: {item.roomNumber || "N/A"}</Text>

        {/* NEW: show priority consistently; fallback to template priority */}
        <Text style={styles.taskText}>
          Priority: {item.priority ?? item.defaultPriority ?? "Unassigned"}
        </Text>

        {/* NEW: subtle hint when we're showing the template rather than instances */}
        {useTemplate && (
          <Text style={[styles.taskText, { opacity: 0.7 }]}>
            (From {dayLabel} template)
          </Text>
        )}
      </View>

      {/* right-side status pill (unchanged) */}
      <View style={styles.pillRail}>
        <View
          style={[
            styles.pill,
            { backgroundColor: getStatusColor(item) },
          ]}
        />
      </View>
    </TouchableOpacity>
  );

  const openHistory = () => router.push("/completedTasks");

  return (
    <SafeAreaView style={styles.container}>
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
                {/* NEW: header text now reflects whether we're showing template or instances */}
                <TouchableOpacity
                  onPress={() => setShowTasks(!showTasks)}
                  style={styles.header}
                >
                  <Text style={styles.headerText}>
                    {useTemplate
                      ? `Today's Plan • ${dayLabel}`   // NEW: if no instances, show plan (template)
                      : `Today's Tasks • ${dayLabel}`} {/* NEW: instances exist for today*/}
                    {showTasks ? " ▲" : " ▼"}
                  </Text>
                </TouchableOpacity>

                {showTasks && (
                  <View>
                    {/* Priority 1 */}
                    <TouchableOpacity
                      onPress={() => setShowP1(!showP1)}
                      style={styles.subHeader}
                    >
                      <Text style={styles.subHeaderText}>
                        Priority 1 {showP1 ? "▲" : "▼"}
                      </Text>
                    </TouchableOpacity>
                    {showP1 &&
                      (displayP1.length === 0 ? (
                        <Text style={styles.emptyText}>
                          No items for Priority 1.
                        </Text>
                      ) : (
                        displayP1.map((item) => renderCard(item))
                      ))}

                    {/* Priority 2 */}
                    <TouchableOpacity
                      onPress={() => setShowP2(!showP2)}
                      style={styles.subHeader}
                    >
                      <Text style={styles.subHeaderText}>
                        Priority 2 {showP2 ? "▲" : "▼"}
                      </Text>
                    </TouchableOpacity>
                    {showP2 &&
                      (displayP2.length === 0 ? (
                        <Text style={styles.emptyText}>
                          No items for Priority 2.
                        </Text>
                      ) : (
                        displayP2.map((item) => renderCard(item))
                      ))}

                    {/* Priority 3 */}
                    <TouchableOpacity
                      onPress={() => setShowP3(!showP3)}
                      style={styles.subHeader}
                    >
                      <Text style={styles.subHeaderText}>
                        Priority 3 {showP3 ? "▲" : "▼"}
                      </Text>
                    </TouchableOpacity>
                    {showP3 &&
                      (displayP3.length === 0 ? (
                        <Text style={styles.emptyText}>
                          No items for Priority 3.
                        </Text>
                      ) : (
                        displayP3.map((item) => renderCard(item))
                      ))}
                  </View>
                )}

                {/* Projects (unchanged) */}
                <TouchableOpacity
                  onPress={() => setShowProjects(!showProjects)}
                  style={styles.header}
                >
                  <Text style={styles.headerText}>
                    Projects {showProjects ? "▲" : "▼"}
                  </Text>
                </TouchableOpacity>
                {showProjects &&
                  (currentProjects.length === 0 ? (
                    <Text style={styles.emptyText}>
                      No pending projects available.
                    </Text>
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

// ===========================================
// NEW: Map a template item -> instance-like UI
// ===========================================
// Before: no template fallback, so this didn't exist.
// Why: It lets the renderer treat template items like tasks.
function tplToDisplayShape(t: any) {
  return {
    id: `tpl_${t.id}`,             // avoid key collisions with real tasks
    title: t.title,
    taskType: t.title,
    description: t.description,
    roomNumber: t.roomNumber ?? "",
    priority: t.defaultPriority ?? 3,
    defaultPriority: t.defaultPriority ?? 3,
    status: "pending",             // templates are "pending" by default
    assignedWorkers: [],           // not assigned yet
    order: t.order ?? 0,
  };
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#1E293B" : "#F9FAFB",
    },
    scrollContainer: {
      padding: 16,
      paddingBottom: 40,
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
      // NEW: slightly smaller font (22 -> 20) to fit the day label & arrows nicely
      // Before: 22; Why: minor polish for the added day label text.
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
      backgroundColor: isDark ? "#334155" : "#FFFFFF",
      borderRadius: 16,
      padding: 20,
      paddingRight: 28, // NEW: extra space so text doesn’t collide with pill rail
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 6,
      position: "relative",
      overflow: "hidden",
    },
    // right-side rail that holds the pill
    pillRail: {
      position: "absolute",
      right: 8,
      top: 8,
      bottom: 8,
      width: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    // vertical pill itself
    pill: {
      width: 8,
      borderRadius: 8,
      height: "80%",
    },
    taskTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: isDark ? "#E2E8F0" : "#111",
      marginBottom: 4,
    },
    taskText: {
      fontSize: 14,
      color: isDark ? "#CBD5E1" : "#444",
      marginBottom: 2,
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
  });
