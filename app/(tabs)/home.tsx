import React, { useState } from "react";
import { Text, View, TouchableOpacity, StyleSheet } from "react-native";
import TaskModal from "../(components)/taskModal";

function homePage() {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home Page</Text>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addButtonText}>Submit Request</Text>
      </TouchableOpacity>

      {modalVisible && (
        <TaskModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
        />
      )}
    </View>
  );
}
export default homePage;

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
});
