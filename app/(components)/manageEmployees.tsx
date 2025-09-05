import React, { useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  Animated,
  Easing,
} from "react-native";
import { useTheme } from "../ThemeContext";
import { db } from "../../firebaseConfig";
import { query, where, onSnapshot, collection } from "firebase/firestore";
import { useShiftTimer } from "../(hooks)/secondsCounter";
import { Ionicons } from "@expo/vector-icons";

type Emp = {
  id: string;
  name?: string;
  displayName?: string;
  email?: string;
  role?: string;
  currentTask?: string;
  pendingTasks?: any[];
  [key: string]: any;
};

export default function ManageEmployees() {
  const [onShiftEmployees, setOnShiftEmployees] = useState<Emp[]>([]);
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const s = getStyles(isDark);

  // theme crossfade
  const themeAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(themeAnim, {
      toValue: isDark ? 1 : 0,
      duration: 220,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [isDark, themeAnim]);

  useEffect(() => {
    const qy = query(
      collection(db, "users"),
      where("role", "==", "employee"),
      where("onShift", "==", true)
    );
    const unsub = onSnapshot(qy, (snapshot) => {
      const employees = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as Emp[];
      setOnShiftEmployees(employees);
    });
    return unsub;
  }, []);

  const openEmployee = (emp: Emp) => {
    router.push({
      pathname: "/employeeOpened[id]",
      params: {
        empId: emp.id,
        name: emp.name ?? emp.displayName ?? "",
        email: emp.email ?? "",
        currentTask: emp.currentTask ?? "",
        pendingTasks: JSON.stringify(emp.pendingTasks ?? []),
      },
    });
  };

  return (
    <SafeAreaView style={s.container}>
      {/* crossfade layers */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#F8FAFC" }]} />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "#0F172A", opacity: themeAnim },
        ]}
      />

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

        <Text style={s.headerTitle}>Manage Employees</Text>

        <TouchableOpacity
          onPress={toggleTheme}
          style={s.smallGreyBtn}
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

      {/* Blue banner like other screens */}
      <View style={s.banner}>
        <Text style={s.bannerTitle}>Employees currently on shift</Text>
        <Text style={s.bannerSubtitle}>
          Tap a card to view details, tasks, and status
        </Text>
      </View>

      {onShiftEmployees.length === 0 ? (
        <View style={s.center}>
          <Ionicons
            name="people-outline"
            size={28}
            color={isDark ? "#94A3B8" : "#64748B"}
          />
          <Text style={s.emptyText}>No employees currently on shift.</Text>
        </View>
      ) : (
        <FlatList
          data={onShiftEmployees}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          renderItem={({ item }) => (
            <EmployeeRow
              emp={item}
              isDark={isDark}
              onPress={() => openEmployee(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function EmployeeRow({
  emp,
  isDark,
  onPress,
}: {
  emp: Emp;
  isDark: boolean;
  onPress: () => void;
}) {
  const { loading, running, hhmmss } = useShiftTimer(emp.id);

  // pulse glow for active on-shift employees
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
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
    ).start();
  }, [pulse]);

  const glowStyle = useMemo(() => {
    if (!running) return {};
    const intensity = pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.2, 0.65],
    });
    return {
      borderWidth: 2,
      borderColor: isDark ? "rgba(59,130,246,0.85)" : "rgba(29,78,216,0.9)",
      shadowColor: isDark ? "#60A5FA" : "#3B82F6",
      shadowOpacity: intensity as unknown as number,
      shadowRadius: 12,
      elevation: 8,
    } as any;
  }, [pulse, running, isDark]);

  const name = emp.name || emp.displayName || emp.email || emp.id;
  const role = (emp.role || "employee").toString();

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      <Animated.View style={[stylesCard.taskCardBase(isDark), glowStyle]}>
        <View style={{ paddingRight: 14 }}>
          <View style={stylesCard.titleRow}>
            <Text style={stylesCard.taskTitle(isDark)} numberOfLines={1}>
              {name}
            </Text>
            <View style={stylesCard.rolePill}>
              <Ionicons name="id-card-outline" size={12} color="#fff" />
              <Text style={stylesCard.rolePillText}>{role}</Text>
            </View>
          </View>

          {loading ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator />
              <Text style={stylesCard.taskText(isDark)}>Calculating…</Text>
            </View>
          ) : running ? (
            <Text style={stylesCard.taskText(isDark)}>On shift: {hhmmss}</Text>
          ) : (
            <Text style={stylesCard.taskText(isDark)}>Not clocked in</Text>
          )}

          {!!emp.currentTask && (
            <Text style={stylesCard.taskSubtle(isDark)} numberOfLines={1}>
              Current task: {emp.currentTask}
            </Text>
          )}
        </View>

        {/* right-side status rail */}
        <View style={stylesCard.pillRail}>
          <View
            style={[
              stylesCard.pill,
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
      </Animated.View>
    </TouchableOpacity>
  );
}

/* ===== Styles ===== */
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
      paddingHorizontal: 12,
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

    listContent: {
      padding: 16,
      paddingBottom: 24,
    },

    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: 16,
    },
    emptyText: {
      fontSize: 16,
      color: isDark ? "#9CA3AF" : "#64748B",
      textAlign: "center",
    },
  });

/* Card styles separated so we can compute with isDark easily */
const stylesCard = {
  taskCardBase: (isDark: boolean) =>
    ({
      backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
      borderRadius: 16,
      padding: 16,
      paddingRight: 28,
      marginBottom: 0,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 6,
      position: "relative",
      overflow: "hidden",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#111827" : "transparent",
    } as const),

  titleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: 8,
    marginBottom: 2,
  },

  taskTitle: (isDark: boolean) =>
    ({
      fontSize: 16,
      fontWeight: "800",
      color: isDark ? "#E2E8F0" : "#0F172A",
      flexShrink: 1,
    } as const),

  taskText: (isDark: boolean) =>
    ({
      fontSize: 14,
      color: isDark ? "#CBD5E1" : "#334155",
      marginTop: 2,
    } as const),

  taskSubtle: (isDark: boolean) =>
    ({
      fontSize: 12,
      color: isDark ? "#94A3B8" : "#64748B",
      marginTop: 2,
    } as const),

  rolePill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#10B981",
  },

  rolePillText: {
    color: "#fff",
    fontWeight: "800" as const,
    fontSize: 12,
    letterSpacing: 0.3,
  },

  pillRail: {
    position: "absolute" as const,
    right: 8,
    top: 8,
    bottom: 8,
    width: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  pill: {
    width: 8,
    borderRadius: 8,
    height: "80%" as `${number}%`, 
  },
};
