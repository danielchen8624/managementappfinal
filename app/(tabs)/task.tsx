import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { db } from "../../firebaseConfig";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import React, { useState, useEffect } from "react";
import { useUser } from "../UserContext";
import { useTheme } from "../ThemeContext";

function TaskPage() {
  const [currentTasks, setCurrentTasks] = useState<any[]>([]);
  const [currentProjects, setCurrentProjects] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTasks, setShowTasks] = useState(true);
  const [showProjects, setShowProjects] = useState(true);

  const { theme } = useTheme();
  const isDark = theme === "dark";
  const styles = getStyles(isDark);
  const { role, loading } = useUser();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    const tasksQ = query(collection(db, "tasks"), where("status", "==", "pending"));
    const projectsQ = query(collection(db, "projects"), where("status", "==", "pending"));

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
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator />
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

  if (role === "customer") return null;

  const openScreen = (item: any) => {
    router.push({
      pathname: "/taskClicked",
      params: {
        taskId: item.id,
        taskType: item.taskType,
        taskDescription: item.description,
        taskRoomNumber: item.roomNumber,
        taskPriority: item.priority,
        taskStatus: item.status,
        taskCreatedBy: item.createdBy,
        taskCreatedAt: item.createdAt?.toDate().toLocaleString(),
      },
    });
  };

  const renderCard = (item: any) => (
    <TouchableOpacity key={item.id} onPress={() => openScreen(item)} style={styles.taskCard}>
      <Text style={styles.taskTitle}>Type: {item.taskType}</Text>
      <Text style={styles.taskText}>Room: {item.roomNumber || "N/A"}</Text>
      <Text style={styles.taskText}>Priority: {item.priority ?? "Unassigned"}</Text>
      <Text style={styles.taskText}>Date: {item.createdAt?.toDate().toLocaleString()}</Text>
    </TouchableOpacity>
  );

  const openHistory = () => {
    router.push("/completedTasks");
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={openHistory} style={styles.historyButton}>
        <Text style={styles.historyButtonText}>Task History</Text>
      </TouchableOpacity>

      <FlatList
        data={[]} // dummy to prevent errors
        renderItem={() => null}
        keyExtractor={() => Math.random().toString()}
        contentContainerStyle={styles.scrollContainer}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        ListHeaderComponent={
          <>
            <TouchableOpacity onPress={() => setShowTasks(!showTasks)} style={styles.header}>
              <Text style={styles.headerText}>Tasks {showTasks ? "▲" : "▼"}</Text>
            </TouchableOpacity>
            {showTasks &&
              (currentTasks.length === 0 ? (
                <Text style={styles.emptyText}>No pending tasks available.</Text>
              ) : (
                currentTasks.map((item) => renderCard(item))
              ))}

            <TouchableOpacity onPress={() => setShowProjects(!showProjects)} style={styles.header}>
              <Text style={styles.headerText}>Projects {showProjects ? "▲" : "▼"}</Text>
            </TouchableOpacity>
            {showProjects &&
              (currentProjects.length === 0 ? (
                <Text style={styles.emptyText}>No pending projects available.</Text>
              ) : (
                currentProjects.map((item) => renderCard(item))
              ))}
          </>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

export default TaskPage;

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#1E293B" : "#F9FAFB",
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
      backgroundColor: isDark ? "#3B82F6" : "#2563EB",
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
      backgroundColor: isDark ? "#1D4ED8" : "#007AFF",
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
      backgroundColor: isDark ? "#334155" : "#FFFFFF",
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
      color: isDark ? "#E2E8F0" : "#111",
      marginBottom: 4,
    },
    taskText: {
      fontSize: 14,
      color: isDark ? "#CBD5E1" : "#444",
      marginBottom: 2,
    },
    emptyText: {
      fontSize: 16,
      textAlign: "center",
      marginTop: 32,
      marginBottom: 32,
      color: isDark ? "#9CA3AF" : "#999",
    },
    text: {
      color: isDark ? "#E5E7EB" : "#111",
    },
  });
