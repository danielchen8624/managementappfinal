import React, { useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import TaskModal from "../(components)/taskModal";
import ProjectModal from "../(components)/projectModal";
import CurrentTaskModal from "../(components)/currentTask";
import { router } from "expo-router";
import { useUser } from "../UserContext";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useTheme } from "../ThemeContext";

function HomePage() {
  const [modalVisible, setModalVisible] = useState(false);
  const [projectModal, setProjectModal] = useState(false);
  const [currentTaskModal, setCurrentTaskModal] = useState(false);
  const { role, loading } = useUser();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const styles = getStyles(isDark);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Welcome{role ? `, ${role}` : ""}!</Text>

      {(role === "customer" || role === "manager") && (
        <TouchableOpacity onPress={() => router.push("/requestHistory")} style={styles.grayButton}>
          <MaterialIcons name="history" size={20} color="white" style={styles.icon} />
          <Text style={styles.buttonText}>View Request History</Text>
        </TouchableOpacity>
      )}

      {role === "manager" && (
        <>
          <TouchableOpacity
            onPress={() => router.push("/manageEmployees")}
            style={styles.purpleButton}
          >
            <Ionicons name="people" size={20} color="white" style={styles.icon} />
            <Text style={styles.buttonText}>Manage Employees</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setProjectModal(true)} style={styles.primaryButton}>
            <FontAwesome5 name="project-diagram" size={18} color="white" style={styles.icon} />
            <Text style={styles.buttonText}>Add New Project</Text>
          </TouchableOpacity>
        </>
      )}

      {role === "employee" && (
        <TouchableOpacity onPress={() => setCurrentTaskModal(true)} style={styles.primaryButton}>
          <MaterialIcons name="assignment" size={20} color="white" style={styles.icon} />
          <Text style={styles.buttonText}>View Current Task</Text>
        </TouchableOpacity>
      )}

      {role === "customer" && (
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.primaryButton}>
          <Ionicons name="create" size={20} color="white" style={styles.icon} />
          <Text style={styles.buttonText}>Submit Request</Text>
        </TouchableOpacity>
      )}

      {/* Modals */}
      {modalVisible && (
        <TaskModal visible={modalVisible} onClose={() => setModalVisible(false)} />
      )}
      {projectModal && (
        <ProjectModal visible={projectModal} onClose={() => setProjectModal(false)} />
      )}
      {currentTaskModal && (
        <CurrentTaskModal visible={currentTaskModal} onClose={() => setCurrentTaskModal(false)} />
      )}
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
  });
