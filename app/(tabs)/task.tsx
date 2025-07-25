import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { db } from "../../firebaseConfig";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import React, { useState, useEffect } from "react";
import { useUser } from "../UserContext";

function TaskPage() {
  const [currentTasks, setCurrentTasks] = useState<any[]>([]);
  const [currentProjects, setCurrentProjects] = useState<any[]>([]);

  const { role, loading } = useUser();
  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator />
        <Text>Loading...</Text>
      </View>
    );
  }

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

  useEffect(() => {
    const tasksQ = query(
      collection(db, "tasks"),
      where("status", "==", "pending")
    );
    const projectsQ = query(
      collection(db, "projects"),
      where("status", "==", "pending")
    );

    const unsubTasks = onSnapshot(tasksQ, (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      items.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
      setCurrentTasks(items);
    });

    const unsubProjects = onSnapshot(projectsQ, (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      items.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
      setCurrentProjects(items);
    });

    return () => {
      unsubTasks();
      unsubProjects();
    };
  }, []);

  if (role === "customer") {
    return null;
  }

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

  const openHistory = () => {
    router.push({ pathname: "/completedTasks" });
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={openHistory} style={styles.historyButton}>
        <Text style={styles.historyButtonText}>Task History</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {currentTasks.length === 0 ? (
          <Text style={styles.emptyText}>No pending tasks available.</Text>
        ) : (
          currentTasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              onPress={() => openScreen(task)}
              style={styles.taskCard}
            >
              <Text style={styles.taskTitle}>Type: {task.taskType}</Text>
              <Text style={styles.taskText}>
                Room: {task.roomNumber || "N/A"}
              </Text>
              <Text style={styles.taskText}>
                Priority: {task.priority ?? "Unassigned"}
              </Text>
              <Text style={styles.taskText}>
                Date: {task.createdAt?.toDate().toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))
        )}

        <View style={styles.header}>
          <Text style={styles.headerText}>Projects ▼</Text>
        </View>

        {currentProjects.length === 0 ? (
          <Text style={styles.emptyText}>No pending projects available.</Text>
        ) : (
          currentProjects.map((project) => (
            <TouchableOpacity
              key={project.id}
              onPress={() => openScreen(project)}
              style={styles.taskCard}
            >
              <Text style={styles.taskTitle}>Type: {project.taskType}</Text>
              <Text style={styles.taskText}>
                Room: {project.roomNumber || "N/A"}
              </Text>
              <Text style={styles.taskText}>
                Priority: {project.priority ?? "Unassigned"}
              </Text>
              <Text style={styles.taskText}>
                Date: {project.createdAt?.toDate().toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default TaskPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    width: "100%",
    paddingVertical: 16,
    paddingHorizontal: 20,
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
  historyButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: "center",
    marginVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  historyButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
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
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 32,
    color: "#999",
  },
});
