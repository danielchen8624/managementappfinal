import React, { useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import ProjectModal from "../(components)/taskModal";
import ReportModal from "../(components)/reportModal";
import ManagerViewReportsModal from "../(components)/managerViewReportModal"
import CurrentTaskModal from "../(components)/currentTaskModal";
import { router } from "expo-router";
import { useUser } from "../UserContext";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useTheme } from "../ThemeContext";

function HomePage() {
  const [modalVisible, setModalVisible] = useState(false);
  const [taskModal, setTaskModal] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [currentTaskModal, setCurrentTaskModal] = useState(false);
  const [managerViewReportModal, setManagerViewReportModal] = useState(false);
  const { role, loading } = useUser();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const styles = getStyles(isDark);

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Welcome{role ? `, ${role}` : ""}!</Text>

      {role === "manager" && (
        <TouchableOpacity
          onPress={() => router.push("/requestHistory")}
          style={styles.grayButton}
        >
          <MaterialIcons
            name="history"
            size={20}
            color="white"
            style={styles.icon}
          />
          <Text style={styles.buttonText}>View Request History</Text>
        </TouchableOpacity>
      )}

      {role === "manager" && (
        <>
          {/* manage Employees button*/}
          <TouchableOpacity
            onPress={() => router.push("/manageEmployees")}
            style={styles.purpleButton}
          >
            <Ionicons
              name="people"
              size={20}
              color="white"
              style={styles.icon}
            />
            <Text style={styles.buttonText}>Manage Employees</Text>
          </TouchableOpacity>

          {/* add task button*/}

          <TouchableOpacity
            onPress={() => setTaskModal(true)}
            style={styles.primaryButton}
          >
            <FontAwesome5
              name="project-diagram"
              size={18}
              color="white"
              style={styles.icon}
            />
            <Text style={styles.buttonText}>Add New Task</Text>
          </TouchableOpacity>
          {/* submit reports button */}

          <TouchableOpacity
            onPress={() => setManagerViewReportModal(true)}
            style={styles.primaryButton}
          ><Text style = {styles.buttonText}>View Reports</Text></TouchableOpacity>
        </>
      )}

      {role === "employee" && (
        <>
          <TouchableOpacity
            onPress={() => setCurrentTaskModal(true)}
            style={styles.primaryButton}
          >
            <MaterialIcons
              name="assignment"
              size={20}
              color="white"
              style={styles.icon}
            />
            <Text style={styles.buttonText}>View Current Task</Text>
          </TouchableOpacity>
          {/* submit reports button */}

          <TouchableOpacity
            onPress={() => setReportModal(true)}
            style={[styles.reportButton, isDark && styles.reportButtonDark]}
            activeOpacity={0.85}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons
              name="report-problem"
              size={20}
              color={isDark ? "#0B1220" : "#FFFFFF"}
              style={styles.reportIcon}
            />
            <Text
              style={[
                styles.reportButtonText,
                isDark && styles.reportButtonTextDark,
              ]}
            >
              Report Issue
            </Text>
          </TouchableOpacity>
        </>
      )}

      {/* Modals */}
      {taskModal && (
        <ProjectModal visible={taskModal} onClose={() => setTaskModal(false)} />
      )}
      {currentTaskModal && (
        <CurrentTaskModal
          visible={currentTaskModal}
          onClose={() => setCurrentTaskModal(false)}
        />
      )}
      {reportModal && (
        <ReportModal
          visible={reportModal}
          onClose={() => setReportModal(false)}
        />
      )}

      {managerViewReportModal && (
        <ManagerViewReportsModal
          visible={managerViewReportModal}
          onClose={() => setManagerViewReportModal(false)}
        />
      )}

      {/* Navigation Buttons */}
    </View>
  );
}

export default HomePage;

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
      marginBottom: 16,
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
  });
