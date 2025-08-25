import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import React, { useState, useEffect, useMemo } from "react";
import { useUser } from "../UserContext";
import { useTheme } from "../ThemeContext";
import { router } from "expo-router";
import ElapsedTimer from "./elapsedTimer";

type Task = {
  id: string;
  priority?: number;
  roomNumber?: string;
  status: string;
  description: string;
  createdBy: string;
  createdAt?: { toDate: () => Date };
  startTime?: any;
  title: string;
};

type TaskModalProps = {
  visible: boolean;
  onClose: () => void;
};

function CurrentTaskModal({ visible, onClose }: TaskModalProps) {
  const [currentTasks, setCurrentTasks] = useState<Task[]>([]);
  const { role, loading } = useUser();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const s = getStyles(isDark);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const tasksQ = query(
      collection(db, "tasks"),
      where("assignedWorkers", "array-contains", uid),
      where("status", "==", "assigned"),
      where("forToday", "==", true)
    );

    const unsub = onSnapshot(
      tasksQ,
      (snap) => {
        const items: Task[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...(d.data() as any) }));
        items.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
        setCurrentTasks(items);
      },
      (err) => console.error("onSnapshot(tasks) error:", err)
    );

    return () => unsub();
  }, [role]);

  const getStatusColor = (t: Task) => {
    // status rail color (green if assigned, fallback soft)
    if ((t.status || "").toLowerCase() === "assigned") return "#22C55E";
    return isDark ? "#475569" : "#E5E7EB";
    // (If you later add more statuses, expand here.)
  };

  const headerTitle = useMemo(() => {
    if (loading) return "Loading…";
    if (!currentTasks.length) return "No Current Tasks";
    return "Your Current Tasks";
  }, [loading, currentTasks.length]);

  const openScreen = (task: Task) => {
    router.push({
      pathname: "/taskClicked",
      params: {
        taskId: task.id,
        taskTitle: task.title,
        taskDescription: task.description,
        taskRoomNumber: task.roomNumber,
        taskPriority: task.priority,
        taskStatus: task.status,
        taskCreatedBy: task.createdBy,
        taskCreatedAt: task.createdAt?.toDate().toLocaleString(),
      },
    });
  };

  if (!visible) return null;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.sheet, { backgroundColor: isDark ? "#121826" : "#FFFFFF" }]}>
          {/* Header */}
          <View style={s.headerRow}>
            <Text style={s.headerTitle}>{headerTitle}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.close}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          {loading ? (
            <View style={s.center}>
              <ActivityIndicator color={isDark ? "#E5E7EB" : "#111827"} />
              <Text style={s.loadingText}>Fetching tasks…</Text>
            </View>
          ) : currentTasks.length === 0 ? (
            <View style={s.center}>
              <Text style={s.emptyText}>You have no assigned tasks right now.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
              {currentTasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  activeOpacity={0.88}
                  onPress={() => {
                    openScreen(task);
                    onClose();
                  }}
                  style={s.card}
                >
                  <View style={{ paddingRight: 20 }}>
                    <View style={s.titleRow}>
                      <Text style={s.taskTitle}>{task.title|| "Untitled Task"}</Text>
                      {!!task.priority && (
                        <View style={s.priorityPill}>
                          <Text style={s.priorityText}>P{task.priority}</Text>
                        </View>
                      )}
                    </View>

                    <Text style={s.taskMeta}>Room: {task.roomNumber || "N/A"}</Text>
                    
                    {!!task.description && <Text style={s.taskBody}>{task.description}</Text>}

                    <ElapsedTimer
                      start={task.startTime}
                      prefix="Elapsed: "
                      style={s.taskMeta}
                    />
                  </View>

                  {/* Right-side status rail */}
                  <View style={s.pillRail}>
                    <View style={[s.pill, { backgroundColor: getStatusColor(task) }]} />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default CurrentTaskModal;

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 16,
    },
    sheet: {
      width: "100%",
      maxHeight: "80%",
      borderRadius: 16,
      padding: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 10,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#0B1220" : "transparent",
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: isDark ? "#E5E7EB" : "#111827",
      letterSpacing: 0.2,
    },
    close: {
      fontSize: 28,
      lineHeight: 28,
      color: isDark ? "#93A4B3" : "#6B7280",
    },

    center: { alignItems: "center", justifyContent: "center", paddingVertical: 24 },
    loadingText: { marginTop: 8, color: isDark ? "#CBD5E1" : "#334155" },
    emptyText: {
      fontSize: 14,
      color: isDark ? "#A3AAB5" : "#6B7280",
      textAlign: "center",
      paddingVertical: 16,
    },

    card: {
      position: "relative",
      backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
      borderRadius: 16,
      padding: 16,
      marginTop: 10,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 4,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    taskTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: isDark ? "#E2E8F0" : "#0F172A",
      flexShrink: 1,
      paddingRight: 8,
    },
    priorityPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: isDark ? "#2563EB" : "#1D4ED8",
      alignItems: "center",
      justifyContent: "center",
    },
    priorityText: { color: "#fff", fontSize: 12, fontWeight: "800", letterSpacing: 0.3 },

    taskMeta: {
      fontSize: 13,
      color: isDark ? "#CBD5E1" : "#334155",
      marginTop: 2,
    },
    taskBody: {
      fontSize: 14,
      color: isDark ? "#E5E7EB" : "#111827",
      marginTop: 6,
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
  });
