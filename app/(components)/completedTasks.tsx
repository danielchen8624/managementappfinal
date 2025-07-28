import { collection, where, query, onSnapshot } from "firebase/firestore";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { db } from "../../firebaseConfig";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { useUser } from "../UserContext";

function TaskHistory() {
  const [completedTask, setCompletedTask] = useState<any[]>([]);
  const { role, loading } = useUser();

  type Task = {
    id: string;
    type: string;
    description: string;
    createdBy: string;
    createdAt?: {
      toDate: () => Date;
    };
  };

  useEffect(() => {
    const q = query(
      collection(db, "tasks"),
      where("status", "==", "in progress")
    );
    const unsub = onSnapshot(q, (querySnapshot) => {
      const taskData: any[] = [];
      querySnapshot.forEach((doc) => {
        taskData.push({ id: doc.id, ...doc.data() });
      });
      setCompletedTask(taskData);
    });
    return unsub;
  }, []);

  /* const openScreen = (task: Task) => {
    router.push({
      //pathname: "/taskHistoryCompleted",
      params: {
        taskId: task.id,
      },
    });
  };*/

  return (
    <SafeAreaView style={styles.container}>
      {completedTask.length === 0 ? (
        <Text style={styles.emptyText}>No completed tasks available.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.headerText}>Completed Tasks ▼</Text>
          </View>

          {completedTask.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={styles.taskCard}
              // onPress={() => openScreen(task)} // optional if you want interactivity
            >
              <Text style={styles.taskTitle}>Type: {task.type}</Text>
              <Text style={styles.taskText}>
                Description: {task.description}
              </Text>
              <Text style={styles.taskText}>User: {task.createdBy}</Text>
              <Text style={styles.taskText}>
                Date: {task.createdAt?.toDate().toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

export default TaskHistory;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 32,
    marginBottom: 24, // ✅ extra space below empty text
    color: "#999",
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    width: "100%",
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 5,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  headerText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  taskCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  taskText: {
    fontSize: 14,
    color: "#444",
    marginBottom: 2,
  },
});
