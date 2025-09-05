// make this go to a webpage rather than have it directly in app as its more professional
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

export default function TermsOfUseScreen() {
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
        <Text style={s.title}>Terms of Use</Text>

        <View style={s.card}>
          <Text style={s.sectionText}>
            These Terms of Use govern your use of this app. By accessing or
            using the app, you agree to be bound by these terms.
            {"\n\n"}
            1. **Use of the App**: You may use the app only for lawful purposes
            and in accordance with these terms.
            {"\n\n"}
            2. **Accounts**: You are responsible for maintaining the
            confidentiality of your login credentials and any activities under
            your account.
            {"\n\n"}
            3. **Data**: We may collect and store certain information as
            described in our Privacy Policy. By using the app, you consent to
            such collection and use.
            {"\n\n"}
            4. **Limitations**: We are not liable for any indirect, incidental,
            or consequential damages arising from your use of the app.
            {"\n\n"}
            5. **Changes**: We may update these terms from time to time. Your
            continued use of the app means you accept the updated terms.
            {"\n\n"}
            If you have questions, contact us at dcoasismanagement@gmail.com.
          </Text>
        </View>

        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
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
