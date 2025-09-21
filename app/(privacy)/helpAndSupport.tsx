// app/(settings)/helpAndSupport.tsx (or your original path)
import React, { useMemo } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "./../ThemeContext";
import { router } from "expo-router";

const SUPPORT_EMAIL = "dcoasismanagement@gmail.com";
const SUPPORT_PHONE = "6479154852";
const SUPPORT_URL = "https://yourapp.com/support";
const PRIVACY_URL = "https://yourapp.com/privacy";
const TERMS_URL = "https://yourapp.com/terms";
const ABOUT_TEXT =
  "DCOasis helps property managers schedule, assign, and track housekeeping & maintenance tasks in real time.";

export default function HelpAndSupport() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const s = useMemo(() => getStyles(isDark), [isDark]);

  const openExternal = async (url: string) => {
    try {
      const result = await WebBrowser.openBrowserAsync(url);
      if (result.type === "cancel") {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) Linking.openURL(url);
      }
    } catch {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) Linking.openURL(url);
      else Alert.alert("Unable to open link", "Please try again later.");
    }
  };

  const openEmail = async ({
    to = SUPPORT_EMAIL,
    subject = "Support request",
    body = "",
  }: {
    to?: string;
    subject?: string;
    body?: string;
  }) => {
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    try {
      const canOpen = await Linking.canOpenURL(mailto);
      if (canOpen) {
        await Linking.openURL(mailto);
      } else {
        await Clipboard.setStringAsync(to);
        Alert.alert(
          "Email app not found",
          `We copied ${to} to your clipboard. Paste it into your email app to contact us.`
        );
      }
    } catch {
      await Clipboard.setStringAsync(to);
      Alert.alert(
        "Something went wrong",
        `We copied ${to} to your clipboard. Paste it into your email app to contact us.`
      );
    }
  };

  const openPhone = async (phone: string) => {
    const telUrl = `tel:${phone}`;
    try {
      const canOpen = await Linking.canOpenURL(telUrl);
      if (canOpen) {
        await Linking.openURL(telUrl);
      } else {
        Alert.alert("Unable to make a call", `Please dial ${phone} manually.`);
      }
    } catch {
      Alert.alert("Something went wrong", `Please dial ${phone} manually.`);
    }
  };

  const Item = ({
    icon,
    label,
    onPress,
    testID,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    testID?: string;
  }) => (
    <TouchableOpacity style={s.item} onPress={onPress} testID={testID}>
      <View style={s.row}>
        <Ionicons name={icon} size={22} color={isDark ? "#E5E7EB" : "#111827"} />
        <Text style={s.itemText}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={s.chev.color as string} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>Help & Support</Text>

        {/* Quick actions card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Get Help</Text>
          <Item
            icon="mail"
            label="Contact Us (Email)"
            onPress={() =>
              openEmail({
                subject: "Help needed with YourApp",
                body:
                  "Tell us what happened:\n\nSteps to reproduce:\nDevice (e.g., iPhone 15, iOS 18):\nApp version:\nScreenshots/recording (if any):\n",
              })
            }
            testID="contact-email"
          />
          <Item
            icon="call-outline"
            label="Call Support"
            onPress={() => openPhone(SUPPORT_PHONE)}
            testID="contact-phone"
          />
          <Item
            icon="globe-outline"
            label="Support Site"
            onPress={() => openExternal(SUPPORT_URL)}
            testID="support-site"
          />
          <Item
            icon="bug-outline"
            label="Report a Bug"
            onPress={() =>
              openEmail({
                subject: "Bug report: YourApp",
                body:
                  "Please describe the bug:\n\nExpected result:\nActual result:\nSteps to reproduce:\nDevice / iOS version:\nApp version:\n",
              })
            }
            testID="report-bug"
          />
        </View>

        {/* Legal card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Legal</Text>
          <Item
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={() => openExternal(PRIVACY_URL)}
            testID="privacy-policy"
          />
          <Item
            icon="document-text-outline"
            label="Terms of Use"
            onPress={() => openExternal(TERMS_URL)}
            testID="terms-of-use"
          />
        </View>

        {/* About card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>About</Text>
          <View style={s.aboutRow}>
            <Ionicons
              name="information-circle-outline"
              size={22}
              color={isDark ? "#E5E7EB" : "#111827"}
            />
            <Text style={s.aboutText}>{ABOUT_TEXT}</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Version</Text>
            <Text style={s.metaValue}>1.0.0</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Support Email</Text>
            <TouchableOpacity onPress={() => openEmail({})}>
              <Text style={s.linkText}>{SUPPORT_EMAIL}</Text>
            </TouchableOpacity>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Support Phone</Text>
            <TouchableOpacity onPress={() => openPhone(SUPPORT_PHONE)}>
              <Text style={s.linkText}>{SUPPORT_PHONE}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Back button (matches privacyPolicy.tsx style) */}
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
      backgroundColor: isDark ? "#0B0F14" : "#F9FAFB",
    },
    scroll: {
      padding: 16,
      gap: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: isDark ? "#F3F4F6" : "#0F172A",
      marginBottom: 4,
    },
    card: {
      backgroundColor: isDark ? "#121923" : "#FFFFFF",
      borderRadius: 16,
      padding: 12,
      shadowColor: "#000",
      shadowOpacity: isDark ? 0.25 : 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
      gap: 4,
      borderWidth: isDark ? 0.5 : 1,
      borderColor: isDark ? "rgba(255,255,255,0.06)" : "#E5E7EB",
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: isDark ? "#9CA3AF" : "#6B7280",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    item: {
      paddingVertical: 12,
      paddingHorizontal: 6,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    itemText: {
      fontSize: 16,
      color: isDark ? "#E5E7EB" : "#111827",
      fontWeight: "600",
    },
    chev: {
      color: isDark ? "#9CA3AF" : "#6B7280",
    },
    aboutRow: {
      flexDirection: "row",
      gap: 10,
      alignItems: "flex-start",
      paddingVertical: 8,
    },
    aboutText: {
      flex: 1,
      fontSize: 15,
      lineHeight: 20,
      color: isDark ? "#CBD5E1" : "#334155",
    },
    metaRow: {
      marginTop: 6,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    metaLabel: {
      fontSize: 14,
      color: isDark ? "#9CA3AF" : "#6B7280",
      fontWeight: "600",
    },
    metaValue: {
      fontSize: 14,
      color: isDark ? "#E5E7EB" : "#111827",
      fontWeight: "600",
    },
    linkText: {
      fontSize: 14,
      color: isDark ? "#93C5FD" : "#2563EB",
      textDecorationLine: "underline",
      fontWeight: "600",
    },

    /* New back button (matches PrivacyPolicy) */
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
