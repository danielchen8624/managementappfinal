import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import React, { useState, useEffect } from "react";
import { useUser } from "../UserContext";

type TaskModalProps = {
  visible: boolean;
  onClose: () => void;
};

function CurrentTaskModal({ visible, onClose }: TaskModalProps) {
  const [currentTasks, setCurrentTasks] = useState<any[]>([]);
  const { role, loading } = useUser();

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || role === "customer") return;

    const tasksQ = query(
      collection(db, "tasks"),
      where("assignedWorker", "==", uid),
      where("status", "==", "pending")
    );

    const unsubTasks = onSnapshot(
      tasksQ,
      (snap) => {
        const items: any[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
        items.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
        setCurrentTasks(items);
      },
      (err) => {
        console.error("onSnapshot error:", err);
      }
    );

    return () => unsubTasks();
  }, [role]);

  if (!visible) return null;

  return (
    <Modal animationType="slide" transparent={true} visible={visible}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>

          {loading ? (
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator />
              <Text>Loading...</Text>
            </View>
          ) : currentTasks.length === 0 ? (
            <Text style={styles.emptyText}>You have no assigned tasks.</Text>
          ) : (
            <ScrollView>
              {currentTasks.map((task) => (
                <View key={task.id} style={styles.taskCard}>
                  <Text style={styles.taskTitle}>Type: {task.taskType}</Text>
                  <Text style={styles.taskText}>Room: {task.roomNumber || "N/A"}</Text>
                  <Text style={styles.taskText}>Priority: {task.priority ?? "Unassigned"}</Text>
                  <Text style={styles.taskText}>
                    Date: {task.createdAt?.toDate().toLocaleString()}
                  </Text>
                  <Text style={styles.taskText}>
                    Description: {task.description || "No description"}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default CurrentTaskModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    maxHeight: "70%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  closeButton: {
    alignSelf: "flex-end",
    marginBottom: 10,
  },
  closeButtonText: {
    fontSize: 24,
    color: "#888",
  },
  taskCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5,
  },
  taskText: {
    fontSize: 14,
    color: "#444",
    marginBottom: 3,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
    color: "#999",
  },
});
