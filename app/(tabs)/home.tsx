import React, { useState, useEffect } from "react";
import { Text, View, TouchableOpacity, StyleSheet } from "react-native";
import TaskModal from "../(components)/taskModal";
import { router } from "expo-router";
import { auth, db } from "../../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useUser } from "../UserContext";
import { ActivityIndicator } from "react-native";
import ProjectModal from "../(components)/projectModal";
function HomePage() {
  const [modalVisible, setModalVisible] = useState(false);
  const [projectModal, setProjectModal] = useState(false);

  const {role, loading} = useUser();

  if (loading) {
    return(
    <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator />
        <Text>Loading...</Text>
      </View>
    )
  }
  return (
    console.log("Role:", role),
    <View style={styles.container}>
      {(role === "customer" || role === "manager") && (
        <TouchableOpacity
          onPress={() => router.push("/requestHistory")}
          style={styles.requestHistoryButton}
        >
          <Text style={styles.requestHistoryText}>History</Text>
        </TouchableOpacity>
      )}
      {role === "manager" && (
        console.log("Manager role detected"),
        <TouchableOpacity
          onPress={() => setProjectModal(true)}
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>Add Project</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.title}>Home Page</Text>

      {role === "customer" && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>Submit Request</Text>
        </TouchableOpacity>
      )}

      {modalVisible && (
        <TaskModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
        />
      )}
      {projectModal && (
        <ProjectModal
          visible={projectModal}
          onClose={() => setProjectModal(false)}
        />
      )}
    </View>
  );
}

export default HomePage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB", // light gray background
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 20,
    color: "#111827", // dark text
  },
  addButton: {
    backgroundColor: "#2563EB", // blue
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2, // for Android
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  requestHistoryButton: {
    backgroundColor: "#4B5563", // gray
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 12,
  },
  requestHistoryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
});
