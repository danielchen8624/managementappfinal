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
  const {role, loading} = useUser();

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
    <SafeAreaView style = {{flex: 1}}>
    <ScrollView contentContainerStyle = {{flexGrow: 1}}>
      {completedTask.map((task) => (
        <TouchableOpacity
         // onPress={() => openScreen(task)}
          key={task.id}
          style={styles.taskCard}
        >
          <Text>{task.type}</Text>
          <Text>{task.description}</Text>
          <Text>User: {task.createdBy}</Text>
          <Text>Date: {task.createdAt?.toDate().toLocaleString()}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
    </SafeAreaView>
  );
}

export default TaskHistory;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  taskCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    alignItems: "center",
  },
});
