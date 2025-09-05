// app/contactUs.tsx
import React, { useMemo } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../ThemeContext";
import { router } from "expo-router";

const SUPPORT_EMAIL = "dcoasismanagement@gmail.com";
const SUPPORT_URL = "https://yourapp.com/support";
const TWITTER_URL = "https://twitter.com/yourapp"; // optional
const INSTAGRAM_URL = "https://instagram.com/yourapp"; // optional

export default function ContactUsScreen() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const s = useMemo(() => getStyles(isDark), [isDark]);

  const openEmail = async () => {
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      "Support Request"
    )}`;
    const canOpen = await Linking.canOpenURL(mailto);
    if (canOpen) {
      Linking.openURL(mailto);
    } else {
      Alert.alert(
        "Email not available",
        `Please contact us at ${SUPPORT_EMAIL}`
      );
    }
  };

  const openLink = async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      Linking.openURL(url);
    } else {
      Alert.alert("Unable to open link");
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        indicatorStyle={isDark ? "white" : "black"}
      >
        <Text style={s.title}>Contact Us</Text>

        <View style={s.card}>
          <Text style={s.sectionText}>
            Have a question or need support? We’d love to hear from you. Choose
            one of the options below:
          </Text>
        </View>

        <TouchableOpacity style={s.cardRow} onPress={openEmail}>
          <Ionicons
            name="mail-outline"
            size={20}
            color={isDark ? "#E5E7EB" : "#111827"}
          />
          <Text style={s.rowText}>Email: {SUPPORT_EMAIL}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.cardRow} onPress={() => openLink(SUPPORT_URL)}>
          <Ionicons
            name="globe-outline"
            size={20}
            color={isDark ? "#E5E7EB" : "#111827"}
          />
          <Text style={s.rowText}>Visit our Support Site</Text>
        </TouchableOpacity>

        {/* Optional social links */}
        <TouchableOpacity style={s.cardRow} onPress={() => openLink(TWITTER_URL)}>
          <Ionicons
            name="logo-twitter"
            size={20}
            color={isDark ? "#E5E7EB" : "#111827"}
          />
          <Text style={s.rowText}>Follow us on Twitter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.cardRow}
          onPress={() => openLink(INSTAGRAM_URL)}
        >
          <Ionicons
            name="logo-instagram"
            size={20}
            color={isDark ? "#E5E7EB" : "#111827"}
          />
          <Text style={s.rowText}>Check us out on Instagram</Text>
        </TouchableOpacity>

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
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      borderRadius: 12,
      backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    rowText: {
      fontSize: 16,
      fontWeight: "600",
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
