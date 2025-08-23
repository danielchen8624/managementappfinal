import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import { router, useLocalSearchParams } from "expo-router";
import {
  doc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import { useTheme } from "../ThemeContext";
import { Ionicons } from "@expo/vector-icons";

export default function ToDoScreen() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const s = getStyles(isDark);

  const params = useLocalSearchParams();
  const taskDescription = (params.taskDescription as string) || "";
  const createdBy = (params.createdBy as string) || "";
  const taskId = params.taskId as string;
  const taskStatus = (params.taskStatus as string) || "";

  const handleCompleteTask = async () => {
    if (!taskId) return console.error("No task ID found!");
    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, {
        status: "completed",
        completedAt: serverTimestamp(),
        completedBy: arrayUnion(auth.currentUser?.uid || "unknown"),
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
    try {
      const taskRef = doc(db, "tasks", taskId);
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
        <Text style={s.bannerTitle}>Review & Take Action</Text>
        <Text style={s.bannerSubtitle}>
          Accept to start; complete when done.
        </Text>
      </View>

      {/* Content */}
      <View style={s.container}>
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.label}>Description</Text>
            <Text style={[s.value, { lineHeight: 20 }]}>{taskDescription}</Text>
          </View>

          <View style={s.row}>
            <Text style={s.label}>Created By</Text>
            <Text style={s.value}>{createdBy || "Unknown"}</Text>
          </View>

          <View style={{ height: 8 }} />

          {taskStatus === "pending" ? (
            <>
              <Text style={s.question}>Do you want to accept this task?</Text>
              <View style={s.buttonCol}>
                <TouchableOpacity
                  onPress={handleAccept}
                  style={s.primaryBtn}
                  activeOpacity={0.9}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
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
          ) : (
            <>
              <Text style={s.question}>Mark this task as completed?</Text>
              <View style={s.buttonCol}>
                <TouchableOpacity
                  style={s.successBtn}
                  onPress={handleCompleteTask}
                  activeOpacity={0.9}
                >
                  <Ionicons name="checkmark-done" size={18} color="#fff" />
                  <Text style={s.primaryBtnText}>I’ve completed this task</Text>
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
        </View>
      </View>
    </SafeAreaView>
  );
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
      flex: 1,
      padding: 16,
      justifyContent: "center",
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

    buttonCol: {
      gap: 10,
      marginTop: 4,
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
