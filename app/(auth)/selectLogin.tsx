import React, { useEffect, useRef } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  Easing,
} from "react-native";
import { router } from "expo-router";
import { useTheme } from "../ThemeContext";
import { Ionicons } from "@expo/vector-icons";

type RoleKey = "supervisor" | "manager" | "security" | "employee";

function SelectLogin() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const s = getStyles(isDark);

  // theme crossfade (matches your other pages)
  const themeAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(themeAnim, {
      toValue: isDark ? 1 : 0,
      duration: 220,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [isDark, themeAnim]);

  const handleSelect = (role: RoleKey) => {
    router.replace({
      pathname: "../login",
      params: { role },
    });
  };

  return (
    <SafeAreaView style={s.screen}>
      {/* crossfade layers */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#F8FAFC" }]} />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "#0F172A", opacity: themeAnim },
        ]}
      />

      {/* header */}
      <View style={s.headerBar}>
        <Text style={s.headerTitle}>Select Login</Text>
        <TouchableOpacity
          onPress={toggleTheme}
          style={s.smallGreyBtn}
          accessibilityLabel="Toggle theme"
        >
          <Ionicons
            name={isDark ? "sunny-outline" : "moon-outline"}
            size={18}
            color={isDark ? "#FDE68A" : "#111827"}
          />
        </TouchableOpacity>
      </View>

      {/* content */}
      <View style={s.container}>
        <Text style={s.subtitle}>Choose a sign-in path</Text>

        <View style={s.grid}>
          {/* Supervisor (renamed from Manager) */}
          <RoleCircle
            isDark={isDark}
            label="Supervisor"
            color="#6366F1"
            icon="people-circle-outline"
            onPress={() => handleSelect("supervisor")}
          />

          {/* Manager */}
          <RoleCircle
            isDark={isDark}
            label="Manager"
            color="#10B981"
            icon="briefcase-outline"
            onPress={() => handleSelect("manager")}
          />

          {/* Security */}
          <RoleCircle
            isDark={isDark}
            label="Security"
            color="#F59E0B"
            icon="shield-checkmark-outline"
            onPress={() => handleSelect("security")}
          />

          {/* Employee */}
          <RoleCircle
            isDark={isDark}
            label="Employee"
            color="#3B82F6"
            icon="construct-outline"
            onPress={() => handleSelect("employee")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

export default SelectLogin;

function RoleCircle({
  isDark,
  label,
  color,
  icon,
  onPress,
}: {
  isDark: boolean;
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={`${label} login`}
        style={{
          width: 84,
          height: 84,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: color,
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
          borderWidth: isDark ? 1 : 0,
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "transparent",
        }}
      >
        <Ionicons name={icon} size={32} color="#fff" />
      </TouchableOpacity>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          color: isDark ? "#E5E7EB" : "#111827",
        }}
      >
        {label}
      </Text>
    </View>
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
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: isDark ? "#F3F4F6" : "#111827",
    },
    smallGreyBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#111827" : "#E5E7EB",
    },
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 14,
    },
    subtitle: {
      textAlign: "center",
      marginBottom: 10,
      fontSize: 14,
      fontWeight: "700",
      color: isDark ? "#B6C2CF" : "#4B5563",
    },
    grid: {
      width: "80%",
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-around",
      rowGap: 20,
      columnGap: 20,
    },
  });
