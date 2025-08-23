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
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import React, { useState, useEffect } from "react";
import { useUser } from "../UserContext";
import { useTheme } from "../ThemeContext";
import { router } from "expo-router";
import ElapsedTimer from "./elapsedTimer";

type Task = {
  id: string;
  priority?: number;
  roomNumber?: string;
  status: string;
  taskType: string;
  description: string;
  createdBy: string;
  createdAt?: {
    toDate: () => Date;
  };
};

type TaskModalProps = {
  visible: boolean;
  onClose: () => void;
};

function CurrentTaskModal({ visible, onClose }: TaskModalProps) {
  const [currentTasks, setCurrentTasks] = useState<any[]>([]);
  const { role, loading } = useUser();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const tasksQ = query(
      collection(db, "tasks"),
      where("assignedWorkers", "array-contains", uid),
      where("status", "==", "assigned"),
      where("forToday", "==", true) 
    );
    const unsubTasks = onSnapshot(
      tasksQ,
      (snap) => {
        const items: any[] = [];
        snap.forEach((d) => {
          items.push({ id: d.id, ...d.data() });
        });
        items.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
        setCurrentTasks(items);
      },
      (err) => {
        console.error("onSnapshot error:", err);
      }
    );

    return () => unsubTasks();
  }, [role]);

  const openScreen = (task: Task) => {
    router.push({
      pathname: "/taskClicked",
      params: {
        taskId: task.id,
        taskType: task.taskType,
        taskDescription: task.description,
        taskRoomNumber: task.roomNumber,
        taskPriority: task.priority,
        taskStatus: task.status,
        taskCreatedBy: task.createdBy,
        taskCreatedAt: task.createdAt?.toDate().toLocaleString(),
      },
    });
  };

  if (!visible) return null;

  return (
    <Modal animationType="slide" transparent={true} visible={visible}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: isDark ? "#1e1e1e" : "#FFFFFF" },
          ]}
        >
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { color: isDark ? "#bbb" : "#888" }]}>×</Text>
          </TouchableOpacity>

          {loading ? (
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color={isDark ? "#fff" : "#000"} />
              <Text style={{ color: isDark ? "#ccc" : "#000" }}>Loading...</Text>
            </View>
          ) : currentTasks.length === 0 ? (
            <Text style={[styles.emptyText, { color: isDark ? "#aaa" : "#999" }]}>
              You have no assigned tasks.
            </Text>
          ) : (
            <ScrollView>
              {currentTasks.map((task) => (
                <TouchableOpacity
                  onPress={async () => {
                    openScreen(task);
                    onClose();
                  }}
                  key={task.id}
                >
                  <View
                    style={[
                      styles.taskCard,
                      {
                        backgroundColor: isDark ? "#2a2a2a" : "#F9FAFB",
                        shadowColor: isDark ? "#000" : "#000",
                      },
                    ]}
                  >
                    <Text style={[styles.taskTitle, { color: isDark ? "#fff" : "#000" }]}>
                      Type: {task.taskType}
                    </Text>
                    <Text style={[styles.taskText, { color: isDark ? "#ccc" : "#444" }]}>
                      Room: {task.roomNumber || "N/A"}
                    </Text>
                    <Text style={[styles.taskText, { color: isDark ? "#ccc" : "#444" }]}>
                      Priority: {task.priority ?? "Unassigned"}
                    </Text>
                    <Text style={[styles.taskText, { color: isDark ? "#ccc" : "#444" }]}>
                      Date: {task.createdAt?.toDate().toLocaleString()}
                    </Text>
                    <Text style={[styles.taskText, { color: isDark ? "#ccc" : "#444" }]}>
                      Description: {task.description || "No description"}
                    </Text>
                    <ElapsedTimer
                      start={task.startTime}
                      prefix="Elapsed: "
                      style={[styles.taskText, { color: isDark ? "#ccc" : "#444" }]}
                    />
                  </View>
                </TouchableOpacity>
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
    borderRadius: 16,
    padding: 20,
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
  },
  taskCard: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
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
    marginBottom: 3,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
  },
});
