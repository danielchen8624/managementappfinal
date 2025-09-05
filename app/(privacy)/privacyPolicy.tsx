// app/privacyPolicy.tsx
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

export default function PrivacyPolicyScreen() {
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
        <Text style={s.title}>Privacy Policy</Text>

        <View style={s.card}>
          <Text style={s.sectionText}>
            This Privacy Policy explains how we collect, use, and protect your
            information when you use our app.
            {"\n\n"}
            **1. Information We Collect**
            {"\n"}- Name, email, and other details you provide when creating an
            account.{"\n"}- Data related to tasks, projects, and usage activity.
            {"\n\n"}
            **2. How We Use Your Information**
            {"\n"}- To provide and improve app functionality.{"\n"}- To
            communicate with you about updates and support.{"\n"}- To ensure the
            security and reliability of our services.
            {"\n\n"}
            **3. Data Storage**
            {"\n"}- Your data is securely stored using Firebase (Google Cloud).{"\n"}- 
            We do not sell or share your data with third parties for marketing.
            {"\n\n"}
            **4. Your Rights**
            {"\n"}- You can request deletion of your account and data by
            contacting us.{"\n"}- You may access or update your information in
            your profile at any time.
            {"\n\n"}
            **5. Contact**
            {"\n"}If you have questions, please contact us at
            dcoasismanagement@gmail.com.
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
