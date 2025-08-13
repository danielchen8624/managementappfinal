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
  const [currentTaskP1, setCurrentTaskP1] = useState<any[]>([]);
  const [currentTaskP2, setCurrentTaskP2] = useState<any[]>([]);
  const [currentTaskP3, setCurrentTaskP3] = useState<any[]>([]);
  const [currentProjects, setCurrentProjects] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [showTasks, setShowTasks] = useState(true);
  const [showP1, setShowP1] = useState(true);
  const [showP2, setShowP2] = useState(true);
  const [showP3, setShowP3] = useState(true);
  const [showProjects, setShowProjects] = useState(true);

  const { theme } = useTheme();
  const isDark = theme === "dark";
  const styles = getStyles(isDark);
  const { role, loading } = useUser();

  useEffect(() => {
    const tasksQ1 = query(
      collection(db, "tasks"),
      where("status", "==", "pending"),
      where("priority", "==", 1)
    );
    const tasksQ2 = query(
      collection(db, "tasks"),
      where("status", "==", "pending"),
      where("priority", "==", 2)
    );
    const tasksQ3 = query(
      collection(db, "tasks"),
      where("status", "==", "pending"),
      where("priority", "==", 3)
    );
    const projectsQ = query(
      collection(db, "projects"),
      where("status", "==", "pending")
    );

    const unsubTasks1 = onSnapshot(tasksQ1, (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setCurrentTaskP1(items);
    });

    const unsubTasks2 = onSnapshot(tasksQ2, (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setCurrentTaskP2(items);
    });

    const unsubTasks3 = onSnapshot(tasksQ3, (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setCurrentTaskP3(items);
    });

    const unsubProjects = onSnapshot(projectsQ, (snap) => {
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      items.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
      setCurrentProjects(items);
    });

    return () => {
      unsubTasks1();
      unsubTasks2();
      unsubTasks3();
      unsubProjects();
    };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // onSnapshot keeps things live; spinner is cosmetic
    setTimeout(() => setIsRefreshing(false), 500);
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator />
        <Text style={styles.text}>Loading...</Text>
      </View>
    );
  }

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
    <TouchableOpacity
      key={item.id}
      onPress={() => openScreen(item)}
      style={styles.taskCard}
    >
      <Text style={styles.taskTitle}>Type: {item.taskType}</Text>
      <Text style={styles.taskText}>Room: {item.roomNumber || "N/A"}</Text>
      <Text style={styles.taskText}>
        Priority: {item.priority ?? "Unassigned"}
      </Text>
      <Text style={styles.taskText}>
        Date: {item.createdAt?.toDate().toLocaleString()}
      </Text>
    </TouchableOpacity>
  );

  const openHistory = () => router.push("/completedTasks");

  return (
    <SafeAreaView style={styles.container}>
      {role === "manager" ? (
        <>
          <TouchableOpacity onPress={openHistory} style={styles.historyButton}>
            <Text style={styles.historyButtonText}>Task History</Text>
          </TouchableOpacity>

          <FlatList
            data={[]}
            renderItem={() => null}
            keyExtractor={() => Math.random().toString()}
            contentContainerStyle={styles.scrollContainer}
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            ListHeaderComponent={
              <>
                {/* Tasks main dropdown */}
                <TouchableOpacity
                  onPress={() => setShowTasks(!showTasks)}
                  style={styles.header}
                >
                  <Text style={styles.headerText}>
                    Tasks {showTasks ? "▲" : "▼"}
                  </Text>
                </TouchableOpacity>

                {showTasks && (
                  <View>
                    {/* Priority 1 */}
                    <TouchableOpacity
                      onPress={() => setShowP1(!showP1)}
                      style={styles.subHeader}
                    >
                      <Text style={styles.subHeaderText}>
                        Priority 1 {showP1 ? "▲" : "▼"}
                      </Text>
                    </TouchableOpacity>
                    {showP1 &&
                      (currentTaskP1.length === 0 ? (
                        <Text style={styles.emptyText}>
                          No pending tasks for Priority 1.
                        </Text>
                      ) : (
                        currentTaskP1.map((item) => renderCard(item))
                      ))}

                    {/* Priority 2 */}
                    <TouchableOpacity
                      onPress={() => setShowP2(!showP2)}
                      style={styles.subHeader}
                    >
                      <Text style={styles.subHeaderText}>
                        Priority 2 {showP2 ? "▲" : "▼"}
                      </Text>
                    </TouchableOpacity>
                    {showP2 &&
                      (currentTaskP2.length === 0 ? (
                        <Text style={styles.emptyText}>
                          No pending tasks for Priority 2.
                        </Text>
                      ) : (
                        currentTaskP2.map((item) => renderCard(item))
                      ))}

                    {/* Priority 3 */}
                    <TouchableOpacity
                      onPress={() => setShowP3(!showP3)}
                      style={styles.subHeader}
                    >
                      <Text style={styles.subHeaderText}>
                        Priority 3 {showP3 ? "▲" : "▼"}
                      </Text>
                    </TouchableOpacity>
                    {showP3 &&
                      (currentTaskP3.length === 0 ? (
                        <Text style={styles.emptyText}>
                          No pending tasks for Priority 3.
                        </Text>
                      ) : (
                        currentTaskP3.map((item) => renderCard(item))
                      ))}
                  </View>
                )}

                {/* Projects dropdown */}
                <TouchableOpacity
                  onPress={() => setShowProjects(!showProjects)}
                  style={styles.header}
                >
                  <Text style={styles.headerText}>
                    Projects {showProjects ? "▲" : "▼"}
                  </Text>
                </TouchableOpacity>
                {showProjects &&
                  (currentProjects.length === 0 ? (
                    <Text style={styles.emptyText}>
                      No pending projects available.
                    </Text>
                  ) : (
                    currentProjects.map((item) => renderCard(item))
                  ))}
              </>
            }
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <View style={{ padding: 16 }}>
          <Text style={styles.text}>Employee view goes here</Text>
        </View>
      )}
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
      marginBottom: 8,
      backgroundColor: isDark ? "#3B82F6" : "#2563EB",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
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
    subHeader: {
      marginTop: 4,
      marginBottom: 4,
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: isDark ? "#1D4ED8" : "#3B82F6",
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 3,
    },
    subHeaderText: {
      fontSize: 18,
      fontWeight: "700",
      color: "#FFFFFF",
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
      marginTop: 16,
      marginBottom: 16,
      color: isDark ? "#9CA3AF" : "#777",
    },
    text: {
      color: isDark ? "#E5E7EB" : "#111",
    },
  });
