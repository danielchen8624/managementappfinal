import React, { useState, useEffect } from "react";
import { router } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "../ThemeContext";
import { db } from "../../firebaseConfig";
import { query, where, onSnapshot, collection } from "firebase/firestore";
import { useShiftTimer } from "../(hooks)/secondsCounter";

function ManageEmployees() {
  const [onShiftEmployees, setOnShiftEmployees] = useState<any[]>([]);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const styles = getStyles(isDark);

  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("role", "==", "employee"),
      where("onShift", "==", true)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const employees = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setOnShiftEmployees(employees);
    });
    return unsub;
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Manage Employees</Text>
        </View>

        {onShiftEmployees.length > 0 ? (
          onShiftEmployees.map((emp) => (
            <TouchableOpacity
              key={emp.id}
              onPress={() => {
                console.log(`Selected employee: ${emp.name || emp.id}`);
                router.push({
                  pathname: "/employeeOpened[id]",
                  params: {
                    empId: emp.id,
                    name: emp.name ?? "",
                    email: emp.email ?? "",
                    currentTask: emp.currentTask ?? "",
                    pendingTasks: emp.pendingTasks ?? [],
                  },
                });
              }}
              style={{ marginBottom: 16 }}
            >
              <EmployeeRow
                key={emp.id}
                emp={emp}
                styles={styles}
                isDark={isDark}
              />
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>No employees currently on shift.</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

function EmployeeRow({
  emp,
  styles,
  isDark,
}: {
  emp: any;
  styles: any;
  isDark: boolean;
}) {
  const { loading, running, hhmmss } = useShiftTimer(emp.id);

  return (
    <View style={styles.taskCard}>
      <View style={{ paddingRight: 14 }}>
        <Text style={styles.taskTitle}>
          {emp.name || emp.displayName || emp.email || emp.id}
        </Text>
        <Text style={styles.taskText}>Role: {emp.role}</Text>
        {loading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <ActivityIndicator />
            <Text style={styles.taskText}>Calculating…</Text>
          </View>
        ) : running ? (
          <Text style={styles.taskText}>On shift: {hhmmss}</Text>
        ) : (
          <Text style={styles.taskText}>Not clocked in</Text>
        )}
      </View>

      {/* right-side green pill to indicate "on shift" */}
      <View style={styles.pillRail}>
        <View
          style={[
            styles.pill,
            {
              backgroundColor: running
                ? "#22C55E"
                : isDark
                ? "#475569"
                : "#E5E7EB",
            },
          ]}
        />
      </View>
    </View>
  );
}

export default ManageEmployees;

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
      fontSize: 22,
      fontWeight: "700",
      color: "#FFFFFF",
      letterSpacing: 0.5,
    },
    taskCard: {
      backgroundColor: isDark ? "#334155" : "#FFFFFF",
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
