import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import React from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/firebaseConfig";
import { router } from "expo-router";
import { useTheme } from "../ThemeContext";

function ProfileScreen() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const handleLogout = async () => {
    try {
      await signOut(auth);
      Alert.alert("Success!", "Logged Out.");
    } catch (error) {
      Alert.alert("Error", "Please Try Again.");
    }
  };

  const editProfile = () => {
    if (auth.currentUser != null) {
      router.push("/editProfile");
    }
  };

  const themedStyles = getStyles(isDark);

  return (
    <View style={themedStyles.container}>
      <Text style={themedStyles.header}>Profile</Text>

      <TouchableOpacity style={themedStyles.button} onPress={editProfile}>
        <Text style={themedStyles.buttonText}>Edit Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[themedStyles.button, themedStyles.logout]}
        onPress={handleLogout}
      >
        <Text style={themedStyles.buttonText}>Sign Out</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          themedStyles.button,
          { backgroundColor: isDark ? "#444" : "#DDD" },
        ]}
        onPress={() => {
          toggleTheme();
          setTimeout(() => console.log("theme is now", theme), 100); // Optional, for debug
        }}
      >
        <Text
          style={[themedStyles.buttonText, { color: isDark ? "#FFF" : "#000" }]}
        >
          Toggle Theme
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default ProfileScreen;

// Dynamically generate styles based on theme
const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#111827" : "#F9FAFB",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
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
    buttonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
  });
