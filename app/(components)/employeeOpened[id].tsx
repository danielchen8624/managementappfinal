import { useLocalSearchParams, router } from "expo-router";
import {useState, useEffect} from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { useTheme } from "../ThemeContext";
import { db } from "../../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";


function EmployeeDetailPage () {
    const { empId, name, email, currentTask, pendingTasks } = useLocalSearchParams();
    const { theme } = useTheme();
    const isDark = theme === "dark";
    const styles = getStyles(isDark);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.container}>
                <Text style={styles.buttonText}>Employee Details</Text>
            </View>   
            </SafeAreaView>    
    )    

}

export default EmployeeDetailPage

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#111827" : "#F9FAFB",
      paddingHorizontal: 24,
      paddingTop: 80,
      alignItems: "center",
    },
    welcomeText: {
      fontSize: 24,
      fontWeight: "700",
      marginBottom: 32,
      color: isDark ? "#E5E7EB" : "#111827",
    },
    primaryButton: {
      flexDirection: "row",
      backgroundColor: "#2563EB",
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: "center",
      marginBottom: 12, // new (slightly tighter to make room for timer)
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    grayButton: {
      flexDirection: "row",
      backgroundColor: "#4B5563",
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: "center",
      marginBottom: 16,
      elevation: 2,
    },
    purpleButton: {
      flexDirection: "row",
      backgroundColor: "#7C3AED",
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: "center",
      marginBottom: 16,
      elevation: 2,
    },
    buttonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
    icon: {
      marginRight: 10,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: isDark ? "#D1D5DB" : "#6B7280",
    },
    reportButton: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "center",
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: 12,
      backgroundColor: "#EF4444", // red-500
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 5,
      marginTop: 4, // new
    },
    reportButtonDark: {
      backgroundColor: "#F87171", // red-400 for better contrast on dark bg
    },
    reportIcon: {
      marginRight: 6,
    },
    reportButtonText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
    reportButtonTextDark: {
      color: "#0B1220", // very dark blue-gray for contrast on lighter red
      fontWeight: "800",
    },
    timerText: {
      // new
      marginBottom: 16, // new
      fontSize: 16, // new
      fontWeight: "700", // new
      color: isDark ? "#E5E7EB" : "#111827", // new
    }, // new
    timerTextMuted: {
      // new
      marginBottom: 16, // new
      fontSize: 14, // new
      color: isDark ? "#9CA3AF" : "#6B7280", // new
      fontStyle: "italic", // new
    }, // new
  });

