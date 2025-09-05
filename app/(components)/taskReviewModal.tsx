import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Animated,
  Easing,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import { useTheme } from "../ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useBuilding } from "../BuildingContext"; // 👈 current building

type TaskReviewModalProps = {
  visible: boolean;
  onClose: () => void;
};

type Task = {
  id: string;
  taskType?: string;
  title?: string;
  description?: string;
  roomNumber?: string | number;
  status?: string;
  priority?: number;
  createdAt?: any;
  assignedWorkers?: string[];
  assignedTo?: string;
  managerHasReviewed?: boolean;
};

const TaskReviewModal: React.FC<TaskReviewModalProps> = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const s = getStyles(isDark);
  const { buildingId } = useBuilding(); // 👈 building scope

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [declining, setDeclining] = useState<Record<string, boolean>>({});

  // entry animation
  const sheetY = useRef(new Animated.Value(40)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(sheetY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sheetOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      sheetY.setValue(40);
      sheetOpacity.setValue(0);
    }
  }, [visible, sheetOpacity, sheetY]);

  // live list: ONLY completed items that still require a manager review — building-scoped
  useEffect(() => {
    if (!visible) return;

    // if no building selected, clear UI and stop
    if (!buildingId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const qy = query(
      collection(db, "buildings", buildingId, "tasks"),
      where("managerHasReviewed", "==", false),
      where("status", "==", "completed")
    );

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const list: Task[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        list.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
        setTasks(list);
        setLoading(false);
      },
      (err) => {
        console.error("TaskReviewModal onSnapshot", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [visible, buildingId]);

  const trim = (v?: string, n: number = 120) =>
    v ? (v.length > n ? v.slice(0, n - 1) + "…" : v) : "";

  const formatDate = (ts: any) => {
    try {
      const d: Date = ts?.toDate?.() ?? null;
      if (!d) return "";
      return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return "";
    }
  };

  const statusColor = (sVal: string | undefined) => {
    const v = (sVal || "").toLowerCase();
    if (v === "completed") return "#22C55E";
    if (v === "in_progress") return "#EAB308";
    if (v === "assigned") return "#60A5FA";
    return isDark ? "#6B7280" : "#9CA3AF";
  };

  // Approve/verify: mark reviewed — building-scoped
  const verifyTask = async (t: Task) => {
    if (!buildingId) {
      Alert.alert("Select a building", "Please select a building first.");
      return;
    }
    if (updating[t.id]) return;
    try {
      setUpdating((m) => ({ ...m, [t.id]: true }));
      const u = auth.currentUser?.uid || "manager";
      await updateDoc(doc(db, "buildings", buildingId, "tasks", t.id), {
        managerHasReviewed: true,
        reviewedAt: new Date(),
        reviewedBy: u,
      });
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not mark as reviewed.");
    } finally {
      setUpdating((m) => ({ ...m, [t.id]: false }));
    }
  };

  // Decline: bounce back — building-scoped
  const declineTask = async (t: Task) => {
    if (!buildingId) {
      Alert.alert("Select a building", "Please select a building first.");
      return;
    }
    if (declining[t.id]) return;
    try {
      setDeclining((m) => ({ ...m, [t.id]: true }));
      const u = auth.currentUser?.uid || "manager";
      await updateDoc(doc(db, "buildings", buildingId, "tasks", t.id), {
        status: "assigned",
        managerHasReviewed: false,
        forToday: true,
        declinedAt: new Date(),
        declinedBy: u,
      });
      Alert.alert("Declined", "Task sent back to the assignee.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not decline task.");
    } finally {
      setDeclining((m) => ({ ...m, [t.id]: false }));
    }
  };

  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={s.overlay}>
        <Animated.View
          style={[s.sheet, { transform: [{ translateY: sheetY }], opacity: sheetOpacity }]}
        >
          {/* Header */}
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Verify Completed Tasks</Text>
            <TouchableOpacity
              onPress={onClose}
              style={s.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color={isDark ? "#93A4B3" : "#6B7280"} />
            </TouchableOpacity>
          </View>

          {/* No-building banner */}
          {!buildingId && (
            <View style={s.banner}>
              <Text style={s.bannerTitle}>No building selected</Text>
              <Text style={s.bannerSubtitle}>Choose a building to review its tasks.</Text>
            </View>
          )}

          {/* Body */}
          {loading ? (
            <View style={[s.center, { paddingVertical: 24 }]}>
              <ActivityIndicator />
              <Text style={s.muted}>Loading…</Text>
            </View>
          ) : tasks.length === 0 ? (
            <View style={[s.center, { paddingVertical: 24 }]}>
              <Ionicons
                name="checkmark-circle-outline"
                size={22}
                color={isDark ? "#93A3B8" : "#6B7280"}
              />
              <Text style={s.muted}>
                {buildingId ? "You're all caught up." : "Select a building to see tasks."}
              </Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={s.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {tasks.map((t) => {
                const title = t.taskType || t.title || "Untitled";
                const who =
                  (Array.isArray(t.assignedWorkers) && t.assignedWorkers?.length
                    ? `${t.assignedWorkers.length} assignee(s)`
                    : t.assignedTo
                    ? "1 assignee"
                    : "Unassigned") || "Unassigned";

                return (
                  <View key={t.id} style={s.card}>
                    <View style={s.cardHeaderRow}>
                      <Text style={s.cardTitle} numberOfLines={1}>
                        {title}
                      </Text>
                      {!!t.priority && (
                        <View style={s.prioPill}>
                          <Text style={s.prioText}>P{t.priority}</Text>
                        </View>
                      )}
                    </View>

                    <Text style={s.rowText}>
                      Room: <Text style={s.rowTextStrong}>{String(t.roomNumber || "N/A")}</Text>
                    </Text>
                    <Text style={s.rowText}>
                      Status:{" "}
                      <Text style={[s.rowTextStrong, { color: statusColor(t.status) }]}>
                        {t.status || "pending"}
                      </Text>
                    </Text>
                    {!!t.createdAt && (
                      <Text style={s.rowText}>
                        Created: <Text style={s.rowTextStrong}>{formatDate(t.createdAt)}</Text>
                      </Text>
                    )}
                    <Text style={s.rowText}>
                      Assigned: <Text style={s.rowTextStrong}>{who}</Text>
                    </Text>

                    {!!t.description && (
                      <Text style={s.desc} numberOfLines={3}>
                        {trim(t.description, 180)}
                      </Text>
                    )}

                    <View style={s.btnRow}>
                      <TouchableOpacity
                        onPress={() => verifyTask(t)}
                        style={[
                          s.primaryBtn,
                          (updating[t.id] || declining[t.id]) && { opacity: 0.7 },
                        ]}
                        disabled={!buildingId || !!updating[t.id] || !!declining[t.id]}
                        activeOpacity={0.9}
                      >
                        {updating[t.id] ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
                            <Text style={s.primaryBtnText}>Mark Reviewed</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => declineTask(t)}
                        style={[
                          s.dangerBtn,
                          (updating[t.id] || declining[t.id]) && { opacity: 0.7 },
                        ]}
                        disabled={!buildingId || !!updating[t.id] || !!declining[t.id]}
                        activeOpacity={0.9}
                      >
                        {declining[t.id] ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="close-circle-outline" size={18} color="#fff" />
                            <Text style={s.dangerBtnText}>Decline</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
              <View style={{ height: 10 }} />
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

export default TaskReviewModal;

/* ---------- styles ---------- */
const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "flex-end",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingBottom: 12,
    },
    sheet: {
      width: "100%",
      borderRadius: 16,
      backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
      shadowColor: "#000",
      shadowOpacity: 0.16,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 10,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#111827" : "transparent",
      overflow: "hidden",
      maxHeight: "86%",
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? "#111827" : "#E5E7EB",
    },
    sheetTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: isDark ? "#F3F4F6" : "#0F172A",
      letterSpacing: 0.2,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#111827" : "#E5E7EB",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },

    banner: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: isDark ? "#1E293B" : "#E0ECFF",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? "#334155" : "#BFDBFE",
    },
    bannerTitle: {
      fontSize: 14,
      fontWeight: "800",
      color: isDark ? "#E5E7EB" : "#0F172A",
    },
    bannerSubtitle: {
      marginTop: 2,
      fontSize: 12,
      color: isDark ? "#CBD5E1" : "#1E40AF",
    },

    center: { alignItems: "center", justifyContent: "center", gap: 8 },
    muted: { marginTop: 6, color: isDark ? "#93A3B8" : "#6B7280", fontWeight: "700" },

    listContent: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, gap: 12 },

    card: {
      borderRadius: 14,
      padding: 14,
      backgroundColor: isDark ? "#111827" : "#FFFFFF",
      borderWidth: 1,
      borderColor: isDark ? "#1F2937" : "#E5E7EB",
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    cardHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 2,
      gap: 10,
    },
    cardTitle: {
      flex: 1,
      fontSize: 15,
      fontWeight: "900",
      color: isDark ? "#F3F4F6" : "#0F172A",
      letterSpacing: 0.2,
    },
    prioPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: isDark ? "#0B1220" : "#EEF2FF",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1E293B" : "transparent",
    },
    prioText: { fontSize: 11, fontWeight: "900", color: isDark ? "#C7D2FE" : "#1E3A8A", letterSpacing: 0.2 },

    rowText: { fontSize: 13, color: isDark ? "#CBD5E1" : "#334155", marginTop: 2 },
    rowTextStrong: { fontWeight: "800", color: isDark ? "#E5E7EB" : "#111827" },
    desc: { marginTop: 6, fontSize: 13, color: isDark ? "#9CA3AF" : "#6B7280" },

    btnRow: { marginTop: 10, flexDirection: "row", gap: 8 },
    primaryBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: isDark ? "#2563EB" : "#1D4ED8",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1E3A8A" : "transparent",
    },
    primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 14, letterSpacing: 0.2 },
    dangerBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: "#DC2626",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 3,
    },
    dangerBtnText: { color: "#fff", fontWeight: "800", fontSize: 14, letterSpacing: 0.2 },
  });

