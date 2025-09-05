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
import { useTheme } from "../ThemeContext";
import { useUser } from "../UserContext";

function TaskHistory() {
  const [completedTask, setCompletedTask] = useState<any[]>([]);
  const { theme } = useTheme();
  const isDark = theme === "dark";

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

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? "#121212" : "#F9FAFB" },
      ]}
    >
      {completedTask.length === 0 ? (
        <Text style={[styles.emptyText, { color: isDark ? "#aaa" : "#999" }]}>
          No completed tasks available.
        </Text>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View
            style={[
              styles.header,
              {
                backgroundColor: isDark ? "#1f3fff" : "#2563EB",
                shadowColor: isDark ? "#000" : "#000",
              },
            ]}
          >
            <Text style={styles.headerText}>Completed Tasks ▼</Text>
          </View>

          {completedTask.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={[
                styles.taskCard,
                {
                  backgroundColor: isDark ? "#1e1e1e" : "#FFFFFF",
                  shadowColor: isDark ? "#000" : "#ccc",
                },
              ]}
            >
              <Text style={[styles.taskTitle, { color: isDark ? "#fff" : "#000" }]}>
                Type: {task.type}
              </Text>
              <Text style={[styles.taskText, { color: isDark ? "#ccc" : "#444" }]}>
                Description: {task.description}
              </Text>
              <Text style={[styles.taskText, { color: isDark ? "#bbb" : "#444" }]}>
                User: {task.createdBy}
              </Text>
              <Text style={[styles.taskText, { color: isDark ? "#aaa" : "#444" }]}>
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
    marginBottom: 24,
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
    alignItems: "center",
    justifyContent: "center",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
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
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
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
    marginBottom: 2,
  },
});
