import React, { useMemo } from "react";
import { useLocalSearchParams, router } from "expo-router";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../ThemeContext";

type ParamVal = string | string[] | undefined;

function asString(v: ParamVal, fallback = ""): string {
  if (Array.isArray(v)) return v[0] ?? fallback;
  return (v as string) ?? fallback;
}
function asArray(v: ParamVal): string[] {
  if (Array.isArray(v)) return v as string[];
  if (typeof v === "string" && v.trim()) {
    try {
      // allow passing a JSON array string
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {}
    // or a comma-separated string
    return v.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

export default function EmployeeDetailPage() {
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const s = getStyles(isDark);

  const empId = asString(params.empId);
  const name = asString(params.name);
  const email = asString(params.email);
  const currentTask = asString(params.currentTask);
  const pendingTasks = useMemo(() => asArray(params.pendingTasks), [params]);

  return (
    <SafeAreaView style={s.screen}>
      {/* Header */}
      <View style={s.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons
            name="chevron-back"
            size={22}
            color={isDark ? "#E5E7EB" : "#111827"}
          />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Employee Details</Text>
        <View style={s.iconBtn} />
      </View>

      {/* Content */}
      <View style={s.card}>
        <View style={s.row}>
          <Text style={s.label}>Name</Text>
          <Text style={s.value}>{name || "Unknown"}</Text>
        </View>

        <View style={s.row}>
          <Text style={s.label}>Email</Text>
          <Text style={s.value}>{email || "—"}</Text>
        </View>

        <View style={s.row}>
          <Text style={s.label}>Employee ID</Text>
          <Text style={s.value}>{empId || "—"}</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Current Task</Text>
          {currentTask ? (
            <View style={s.taskPill}>
              <Ionicons name="flash" size={14} color="#fff" />
              <Text style={s.taskPillText}>{currentTask}</Text>
            </View>
          ) : (
            <Text style={s.emptyText}>No current task.</Text>
          )}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Pending Tasks</Text>
          {pendingTasks.length === 0 ? (
            <Text style={s.emptyText}>No pending tasks.</Text>
          ) : (
            <FlatList
              data={pendingTasks}
              keyExtractor={(item, idx) => `${item}_${idx}`}
              renderItem={({ item }) => (
                <View style={s.pendingItem}>
                  <View style={s.dot} />
                  <Text style={s.pendingText}>{item}</Text>
                </View>
              )}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={s.sep} />}
            />
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
      backgroundColor: isDark ? "#111827" : "#F9FAFB",
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 8,
      marginBottom: 8,
    },
    iconBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: isDark ? "#E5E7EB" : "#111827",
      letterSpacing: 0.2,
    },

    card: {
      backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
      borderRadius: 16,
      padding: 16,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#0F172A" : "transparent",
    },

    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "#E5E7EB",
    },
    label: {
      fontSize: 14,
      fontWeight: "700",
      color: isDark ? "#CBD5E1" : "#334155",
    },
    value: {
      fontSize: 15,
      fontWeight: "700",
      color: isDark ? "#F3F4F6" : "#0F172A",
      maxWidth: "60%",
      textAlign: "right",
    },

    section: {
      marginTop: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: isDark ? "#E5E7EB" : "#111827",
      marginBottom: 8,
    },

    taskPill: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 8,
      backgroundColor: "#22C55E",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
    },
    taskPillText: {
      color: "#fff",
      fontWeight: "800",
      fontSize: 13,
      letterSpacing: 0.2,
    },

    emptyText: {
      fontSize: 14,
      color: isDark ? "#9CA3AF" : "#6B7280",
    },

    pendingItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
    },
    pendingText: {
      fontSize: 14,
      color: isDark ? "#E5E7EB" : "#111827",
      flexShrink: 1,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: isDark ? "#60A5FA" : "#2563EB",
      marginRight: 10,
    },
    sep: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "#E5E7EB",
    },
  });
