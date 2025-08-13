import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import { router, useLocalSearchParams } from "expo-router";
import {
  doc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import { useTheme } from "../ThemeContext";

function ToDoScreen() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const params = useLocalSearchParams();
  const taskDescription = params.taskDescription as string;
  const createdBy = params.createdBy as string;
  const taskId = params.taskId as string;
  const taskStatus = params.taskStatus as string;

  const handleCompleteTask = async () => {
    if (!taskId) {
      console.error("No task ID found!");
      return;
    }
    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, {
        status: "completed",
        completedAt: new Date(),
      });
      Alert.alert("Task marked as completed!");
      router.back();
    } catch (error) {
      console.error(error);
    }
  };

  const handleAccept = async () => {
    if (!taskId) {
      console.error("No task ID found!");
      return;
    }

    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, {
        status: "assigned",
        assignedWorker: arrayUnion(auth.currentUser?.uid),
        startTime: serverTimestamp(),
      });
      console.log("Updated task to in progress!");
      router.back();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: isDark ? "#121212" : "#F9FAFB",
      }}
    >
      <View
        style={[
          styles.container,
          { backgroundColor: isDark ? "#121212" : "#F9FAFB" },
        ]}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF" },
          ]}
        >
          <Text
            style={[styles.heading, { color: isDark ? "#FFFFFF" : "#000000" }]}
          >
            Task Details
          </Text>

          <Text style={[styles.label, { color: isDark ? "#BBBBBB" : "#444" }]}>
            Description:
          </Text>
          <Text style={[styles.value, { color: isDark ? "#E0E0E0" : "#333" }]}>
            {taskDescription}
          </Text>

          <Text style={[styles.label, { color: isDark ? "#BBBBBB" : "#444" }]}>
            Created By:
          </Text>
          <Text style={[styles.value, { color: isDark ? "#E0E0E0" : "#333" }]}>
            {createdBy}
          </Text>

          <Text
            style={[styles.question, { color: isDark ? "#CCCCCC" : "#000000" }]}
          >
            Do you want to accept this task?
          </Text>

          <View style={styles.buttonRow}>
            {taskStatus === "pending" ? (
              <>
                <TouchableOpacity
                  onPress={handleAccept}
                  style={styles.acceptButton}
                >
                  <Text style={styles.buttonText}>Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={styles.declineButton}
                >
                  <Text style={styles.buttonText}>No</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={handleCompleteTask}
              >
                <Text style={styles.buttonText}>I've Completed This Task</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default ToDoScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  card: {
    flex: 0.8,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
  heading: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },
  value: {
    fontSize: 16,
    marginBottom: 4,
  },
  question: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: 20,
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 24,
  },
  acceptButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    elevation: 4,
  },
  declineButton: {
    backgroundColor: "#f44336",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    elevation: 4,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
