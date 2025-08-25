// app/about.tsx
import React, { useMemo } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../ThemeContext";
import { router } from "expo-router";

export default function AboutScreen() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const s = useMemo(() => getStyles(isDark), [isDark]);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        indicatorStyle={isDark ? "white" : "black"}
      >
        <Text style={s.title}>About This App</Text>

        <View style={s.card}>
          <Text style={s.sectionText}>
            <Text style={{ fontWeight: "700" }}>YourApp</Text> helps property
            managers and employees organize, assign, and track housekeeping and
            maintenance tasks in real time. It’s built to streamline workflows,
            improve communication, and keep everyone on the same page.
          </Text>
        </View>

        <View style={s.card}>
          <Text style={s.sectionLabel}>Version</Text>
          <Text style={s.sectionText}>1.0.0</Text>
        </View>

        <View style={s.card}>
          <Text style={s.sectionLabel}>Developer</Text>
          <Text style={s.sectionText}>Daniel Chen</Text>
          <Text style={[s.sectionText, { marginTop: 4 }]}>
            Support: support@yourapp.com
          </Text>
        </View>

        <View style={s.card}>
          <Text style={s.sectionText}>
            © {new Date().getFullYear()} Daniel Chen. All rights reserved.
          </Text>
        </View>

        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Ionicons
            name="chevron-back"
            size={18}
            color={isDark ? "#E5E7EB" : "#111827"}
          />
          <Text style={s.backBtnText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#0F172A" : "#F9FAFC",
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: 16,
      gap: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: "800",
      color: isDark ? "#F3F4F6" : "#111827",
      marginBottom: 8,
    },
    card: {
      backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
      borderRadius: 16,
      padding: 14,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#111827" : "transparent",
    },
    sectionLabel: {
      fontSize: 15,
      fontWeight: "700",
      color: isDark ? "#C7D2FE" : "#1E3A8A",
      marginBottom: 6,
    },
    sectionText: {
      fontSize: 15,
      lineHeight: 20,
      color: isDark ? "#E5E7EB" : "#111827",
    },
    backBtn: {
      marginTop: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.12)" : "#CBD5E1",
      backgroundColor: isDark ? "#111827" : "#F1F5F9",
    },
    backBtnText: {
      fontSize: 15,
      fontWeight: "600",
      color: isDark ? "#F3F4F6" : "#111827",
    },
  });
