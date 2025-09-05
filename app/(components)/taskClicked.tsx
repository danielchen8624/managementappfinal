import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  FlatList,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import { router, useLocalSearchParams } from "expo-router";
import {
  doc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  onSnapshot,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useTheme } from "../ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "../UserContext";
import { useBuilding } from "../BuildingContext";

type Employee = {
  id: string;
  label: string;
};

export default function ToDoScreen() {
  const { buildingId } = useBuilding();

  const { theme } = useTheme();
  const isDark = theme === "dark";
  const s = getStyles(isDark);
  const { role } = useUser();
  const isManager = role === "manager";

  const params = useLocalSearchParams();
  const taskDescription = (params.taskDescription as string) || "";
  const createdBy =
    (params.taskCreatedBy as string) || (params.createdBy as string) || "";
  const taskId = params.taskId as string;
  const initialStatus = (params.taskStatus as string) || "";

  const [status, setStatus] = useState<string>(initialStatus);
  const [managerHasReviewed, setManagerHasReviewed] = useState<boolean>(false);
  const [assignedWorkers, setAssignedWorkers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([]);

  // Subscribe to the building-scoped task
  useEffect(() => {
    if (!taskId || !buildingId) return;
    const ref = doc(db, "buildings", buildingId, "tasks", taskId); // fixed path
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() || {};
      setStatus(String(data.status || ""));
      setManagerHasReviewed(Boolean(data.managerHasReviewed));
      setAssignedWorkers(
        Array.isArray(data.assignedWorkers) ? data.assignedWorkers : []
      );
    });
    return () => unsub();
  }, [taskId, buildingId]); // include buildingId

  // Fetch employees (manager only)
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const qEmp = query(
          collection(db, "users"),
          where("role", "==", "employee")
        );
        const snap = await getDocs(qEmp);
        const items: Employee[] = [];
        snap.forEach((d) => {
          const v = d.data() as any;
          items.push(mapUserDoc(d.id, v));
        });
        items.sort((a, b) => a.label.localeCompare(b.label));
        setEmployees(items);
      } catch (e) {
        console.error(e);
      }
    };
    if (isManager) loadEmployees();
  }, [isManager]);

  const handleCompleteTask = async () => {
    if (!taskId) return console.error("No task ID found!");
    if (!buildingId) return Alert.alert("Pick a building first.");
    if (managerHasReviewed) {
      Alert.alert(
        "Already reviewed",
        "This task has been approved by a manager and is finalized."
      );
      return;
    }
    try {
      const taskRef = doc(db, "buildings", buildingId, "tasks", taskId);
      await updateDoc(taskRef, {
        status: "completed",
        completedAt: serverTimestamp(),
        completedBy: arrayUnion(auth.currentUser?.uid || "unknown"),
        managerHasReviewed: false,
      });
      Alert.alert("Nice!", "Task marked as completed.");
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not complete the task.");
    }
  };

  const handleAccept = async () => {
    if (!taskId) return console.error("No task ID found!");
    if (!buildingId) return Alert.alert("Pick a building first.");
    if (managerHasReviewed) {
      Alert.alert("Already reviewed", "This task is finalized by a manager.");
      return;
    }
    try {
      const taskRef = doc(db, "buildings", buildingId, "tasks", taskId);
      await updateDoc(taskRef, {
        status: "in_progress",
        assignedWorkers: arrayUnion(auth.currentUser?.uid || "unknown"),
        startTime: serverTimestamp(),
      });
      Alert.alert("Assigned", "You’re now working on this task.");
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not accept the task.");
    }
  };

  const toggleWorker = (uid: string) => {
    if (managerHasReviewed) return;
    setAssignedWorkers((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
    );
  };

  const saveAssignees = async () => {
    if (!taskId) return;
    if (!buildingId) return Alert.alert("Pick a building first.");
    setSaving(true);
    try {
      const taskRef = doc(db, "buildings", buildingId, "tasks", taskId);
      await updateDoc(taskRef, { assignedWorkers });
      Alert.alert("Saved", "Assignees updated.");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not update assignees.");
    } finally {
      setSaving(false);
    }
  };

  const showAcceptSection =
    !isManager && !managerHasReviewed && status === "pending";
  const showCompleteSection =
    !isManager && !managerHasReviewed && status !== "pending";
  const showReviewedMessage = managerHasReviewed === true;

  const selectedLabels = useMemo(() => {
    if (!employees.length || !assignedWorkers.length) return "None";
    const map = new Map(employees.map((e) => [e.id, e.label]));
    return assignedWorkers.map((id) => map.get(id) || id).join(", ");
  }, [employees, assignedWorkers]);

  return (
    <SafeAreaView style={s.screen}>
      {/* Header */}
      <View style={s.headerBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.smallGreyBtn}
          accessibilityLabel="Back"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={isDark ? "#E5E7EB" : "#111827"}
          />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Task Details</Text>
        <View style={s.smallGreyBtnPlaceholder} />
      </View>

      {/* Banner */}
      <View style={s.banner}>
        <Text style={s.bannerTitle}>
          {isManager ? "Manager Review & Assignment" : "Review & Take Action"}
        </Text>
        <Text style={s.bannerSubtitle}>
          {showReviewedMessage
            ? "This task has been reviewed and finalized by a manager."
            : isManager
            ? "Select employees below to assign or unassign this task."
            : "Accept to start; complete when done."}
        </Text>
      </View>

      {/* Body (static layout; only workers list scrolls) */}
      <View style={s.container}>
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.label}>Description</Text>
            <Text style={[s.value, { lineHeight: 20 }]}>{taskDescription}</Text>
          </View>

          <View style={s.row}>
            <Text style={s.label}>Status</Text>
            <Text style={s.value}>{status || "—"}</Text>
          </View>

          {/* Manager block */}
          {isManager ? (
            <>
              <View style={[s.row, { marginTop: 8 }]}>
                <Text style={s.label}>Currently Assigned</Text>
                <Text style={s.value}>{selectedLabels}</Text>
              </View>

              {showReviewedMessage ? (
                <View style={[s.reviewBadge, { marginTop: 8 }]}>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={s.reviewBadgeText}>Completed & Finalized</Text>
                </View>
              ) : (
                <>
                  <Text style={[s.label, { marginTop: 12, marginBottom: 8 }]}>
                    Assign / Unassign Workers
                  </Text>

                  {/* Only this list is scrollable */}
                  <View style={s.listBox}>
                    {employees.length === 0 ? (
                      <Text style={s.value}>No employees found.</Text>
                    ) : (
                      <FlatList
                        data={employees}
                        keyExtractor={(emp) => emp.id}
                        showsVerticalScrollIndicator={false}
                        style={{ maxHeight: 280 }} // cap list height
                        renderItem={({ item: emp }) => {
                          const checked = assignedWorkers.includes(emp.id);
                          return (
                            <TouchableOpacity
                              style={s.checkRow}
                              activeOpacity={0.8}
                              onPress={() => toggleWorker(emp.id)}
                            >
                              <Ionicons
                                name={checked ? "checkbox" : "square-outline"}
                                size={22}
                                color={
                                  checked
                                    ? isDark
                                      ? "#93C5FD"
                                      : "#2563EB"
                                    : isDark
                                    ? "#94A3B8"
                                    : "#64748B"
                                }
                              />
                              <Text style={s.workerText}>{emp.label}</Text>
                            </TouchableOpacity>
                          );
                        }}
                        getItemLayout={(_, index) => ({
                          length: 48,
                          offset: 48 * index,
                          index,
                        })}
                      />
                    )}
                  </View>

                  <View style={s.buttonCol}>
                    <TouchableOpacity
                      style={[s.primaryBtn, { opacity: saving ? 0.7 : 1 }]}
                      onPress={saveAssignees}
                      disabled={saving}
                      activeOpacity={0.9}
                    >
                      <Ionicons name="save" size={18} color="#fff" />
                      <Text style={s.primaryBtnText}>
                        {saving ? "Saving..." : "Update Assignees"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => router.back()}
                      style={s.secondaryBtn}
                      activeOpacity={0.9}
                    >
                      <Ionicons
                        name="arrow-back-circle"
                        size={18}
                        color={isDark ? "#E5E7EB" : "#111827"}
                      />
                      <Text style={s.secondaryBtnText}>Back</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </>
          ) : (
            // Employee flow
            <>
              <View style={{ height: 8 }} />
              {showReviewedMessage ? (
                <>
                  <View style={[s.reviewBadge]}>
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={s.reviewBadgeText}>Completed!</Text>
                  </View>
                  <View style={s.buttonCol}>
                    <TouchableOpacity
                      onPress={() => router.back()}
                      style={s.secondaryBtn}
                      activeOpacity={0.9}
                    >
                      <Ionicons
                        name="arrow-back-circle"
                        size={18}
                        color={isDark ? "#E5E7EB" : "#111827"}
                      />
                      <Text style={s.secondaryBtnText}>Back</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : showAcceptSection ? (
                <>
                  <Text style={s.question}>
                    Do you want to accept this task?
                  </Text>
                  <View style={s.buttonCol}>
                    <TouchableOpacity
                      onPress={handleAccept}
                      style={s.primaryBtn}
                      activeOpacity={0.9}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#fff"
                      />
                      <Text style={s.primaryBtnText}>Yes, I’ll take it</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => router.back()}
                      style={s.secondaryBtn}
                      activeOpacity={0.9}
                    >
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={isDark ? "#E5E7EB" : "#111827"}
                      />
                      <Text style={s.secondaryBtnText}>No, go back</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : showCompleteSection ? (
                <>
                  <Text style={s.question}>Mark this task as completed?</Text>
                  <View style={s.buttonCol}>
                    <TouchableOpacity
                      style={s.successBtn}
                      onPress={handleCompleteTask}
                      activeOpacity={0.9}
                    >
                      <Ionicons name="checkmark-done" size={18} color="#fff" />
                      <Text style={s.primaryBtnText}>
                        I’ve completed this task
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => router.back()}
                      style={s.secondaryBtn}
                      activeOpacity={0.9}
                    >
                      <Ionicons
                        name="arrow-back-circle"
                        size={18}
                        color={isDark ? "#E5E7EB" : "#111827"}
                      />
                      <Text style={s.secondaryBtnText}>Back</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : null}
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function mapUserDoc(id: string, v: any): Employee {
  const label = String(
    v?.firstName || v?.displayName || v?.name || v?.email || id
  );
  return { id, label };
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
    },

    headerBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 8,
    },
    headerTitle: {
      fontSize: 20,
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
    smallGreyBtnPlaceholder: { width: 36, height: 36 },

    banner: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: isDark ? "#1E293B" : "#E0ECFF",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? "#334155" : "#BFDBFE",
    },
    bannerTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: isDark ? "#E5E7EB" : "#0F172A",
    },
    bannerSubtitle: {
      marginTop: 2,
      fontSize: 13,
      color: isDark ? "#CBD5E1" : "#1E40AF",
    },

    container: {
      padding: 16,
    },

    card: {
      borderRadius: 16,
      padding: 20,
      backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 6,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#111827" : "transparent",
    },

    row: { marginBottom: 12 },
    label: {
      fontSize: 12,
      fontWeight: "800",
      color: isDark ? "#C7D2FE" : "#1E3A8A",
      marginBottom: 4,
      letterSpacing: 0.2,
    },
    value: {
      fontSize: 16,
      color: isDark ? "#E5E7EB" : "#111827",
    },

    question: {
      fontSize: 14,
      fontWeight: "800",
      color: isDark ? "#E5E7EB" : "#111827",
      textAlign: "center",
      marginTop: 8,
      marginBottom: 12,
    },

    listBox: {
      borderRadius: 12,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
      backgroundColor: isDark ? "#0B1220" : "#F3F4F6",
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    checkRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 10,
      gap: 10,
    },
    workerText: {
      fontSize: 15,
      color: isDark ? "#E5E7EB" : "#111827",
    },

    buttonCol: {
      gap: 10,
      marginTop: 12,
    },

    primaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: isDark ? "#2563EB" : "#1D4ED8",
      paddingVertical: 14,
      borderRadius: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 3,
    },
    successBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: isDark ? "#22C55E" : "#16A34A",
      paddingVertical: 14,
      borderRadius: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 3,
    },
    reviewBadge: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: isDark ? "#22C55E" : "#16A34A",
      paddingVertical: 12,
      borderRadius: 12,
      marginBottom: 8,
    },
    reviewBadgeText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: 0.3,
    },
    primaryBtnText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: 0.3,
    },

    secondaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: isDark ? "#111827" : "#E5E7EB",
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },
    secondaryBtnText: {
      color: isDark ? "#E5E7EB" : "#111827",
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: 0.3,
    },
  });
