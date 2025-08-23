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

  const handleSelect = (role: string) => {
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

      {/* header bar */}
      <View style={s.headerBar}>
        <Text style={s.headerTitle}>Select Login</Text>
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

      {/* content */}
      <View style={s.container}>
        <Text style={s.subtitle}>Choose a sign-in path</Text>

        <TouchableOpacity
          style={[s.card, s.employeeCard]}
          activeOpacity={0.9}
          onPress={() => handleSelect("employee")}
        >
          <View style={s.iconWrap}>
            <Ionicons name="construct-outline" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Employee Login</Text>
            <Text style={s.cardText}>Track shifts, view tasks, submit reports.</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={isDark ? "#C7D2FE" : "#1E3A8A"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.card, s.managerCard]}
          activeOpacity={0.9}
          onPress={() => handleSelect("manager")}
        >
          <View style={[s.iconWrap, { backgroundColor: "#10B981" }]}>
            <Ionicons name="briefcase-outline" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Manager Login</Text>
            <Text style={s.cardText}>Assign tasks, review reports, manage team.</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={isDark ? "#C7D2FE" : "#1E3A8A"}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default SelectLogin;

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

    container: {
      flex: 1,
      alignItems: "stretch",
      justifyContent: "center",
      paddingHorizontal: 16,
      gap: 12,
    },
    subtitle: {
      textAlign: "center",
      marginBottom: 6,
      fontSize: 14,
      fontWeight: "700",
      color: isDark ? "#B6C2CF" : "#4B5563",
    },

    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
      borderRadius: 16,
      padding: 14,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 6,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#111827" : "transparent",
    },
    employeeCard: {},
    managerCard: {},

    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#3B82F6",
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: isDark ? "#F3F4F6" : "#0F172A",
    },
    cardText: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: "600",
      color: isDark ? "#9CA3AF" : "#4B5563",
    },
  });
