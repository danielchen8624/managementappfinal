import React from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "@/firebaseConfig";
import { router } from "expo-router";
import { useTheme } from "../ThemeContext";

function SettingRow({
  label,
  onPress,
  isDark,
}: {
  label: string;
  onPress: () => void;
  isDark: boolean;
}) {
  const s = getStyles(isDark);
  return (
    <TouchableOpacity style={s.settingButton} onPress={onPress}>
      <Text style={[s.settingButtonText, isDark && s.settingButtonTextDark]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const s = getStyles(isDark);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      Alert.alert("Success!", "Logged Out.");
    } catch {
      Alert.alert("Error", "Please Try Again.");
    }
  };

  const editProfile = () => {
    if (auth.currentUser) router.push("/editProfile");
  };

  const handleSettingTap = (label: string) => {
    Alert.alert(`${label} tapped`);
  };

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        indicatorStyle={isDark ? "white" : "black"}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.container}>
          <Text style={s.header}>Profile</Text>

          <TouchableOpacity style={s.button} onPress={editProfile}>
            <Text style={s.buttonText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.button, s.logout]} onPress={handleLogout}>
            <Text style={s.buttonText}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.button, isDark ? s.neutralDark : s.neutralLight]}
            onPress={() => {
              toggleTheme();
            }}
          >
            <Text style={[s.buttonText, { color: isDark ? "#FFF" : "#000" }]}>
              Toggle Theme
            </Text>
          </TouchableOpacity>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Settings</Text>

            <SettingRow
              label="Privacy Policy"
              onPress={() => handleSettingTap("Privacy Policy")}
              isDark={isDark}
            />
            <SettingRow
              label="Terms of Use"
              onPress={() => handleSettingTap("Terms of Use")}
              isDark={isDark}
            />
            <SettingRow
              label="Help & Support"
              onPress={() => handleSettingTap("Help & Support")}
              isDark={isDark}
            />
            <SettingRow
              label="About"
              onPress={() => handleSettingTap("About")}
              isDark={isDark}
            />
            <SettingRow
              label="Contact Us"
              onPress={() => handleSettingTap("Contact Us")}
              isDark={isDark}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: isDark ? "#111827" : "#F9FAFB",
    },
    scrollView: {
      flex: 1,
      backgroundColor: isDark ? "#111827" : "#F9FAFB",
    },
    scrollContent: {
      flexGrow: 1,
      padding: 20,
    },
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    header: {
      fontSize: 28,
      fontWeight: "700",
      marginBottom: 24,
      color: isDark ? "#E5E7EB" : "#333",
    },
    button: {
      backgroundColor: isDark ? "#2563EB" : "#007AFF",
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      marginTop: 12,
      width: "100%",
      alignItems: "center",
      elevation: 3,
    },
    logout: {
      backgroundColor: isDark ? "#B91C1C" : "#f44336",
    },
    neutralDark: {
      backgroundColor: "#444",
    },
    neutralLight: {
      backgroundColor: "#DDD",
    },
    buttonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
    section: {
      marginTop: 28,
      width: "100%",
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
      paddingTop: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 12,
      color: isDark ? "#E5E7EB" : "#111827",
      alignSelf: "flex-start",
    },
    settingButton: {
      backgroundColor: isDark ? "#1F2937" : "#E5E7EB",
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginTop: 10,
      width: "100%",
      alignItems: "flex-start",
    },
    settingButtonText: {
      color: "#111827",
      fontSize: 16,
      fontWeight: "600",
    },
    settingButtonTextDark: {
      color: "#F9FAFB",
    },
  });
