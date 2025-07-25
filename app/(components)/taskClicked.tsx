import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import { router, useLocalSearchParams } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";

function ToDoScreen() {
  const params = useLocalSearchParams();
  const taskDescription = params.taskDescription as string;
  const createdBy = params.createdBy as string;
  const taskId = params.taskId as string;

  const handleAccept = async () => {
    if (!taskId) {
      console.error("No task ID found!");
      return;
    }

    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, {
        status: "in progress",
        assignedWorker: auth.currentUser?.uid
      });
      console.log("Updated task to in progress!");
      router.back();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.heading}>Task Details</Text>
          <Text style={styles.label}>Description:</Text>
          <Text style={styles.value}>{taskDescription}</Text>

          <Text style={styles.label}>Created By:</Text>
          <Text style={styles.value}>{createdBy}</Text>

          <Text style={styles.question}>Do you want to accept this task?</Text>

          <View style={styles.buttonRow}>
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
    backgroundColor: "#F9FAFB",
    padding: 16,
    justifyContent: "center",
  },
  card: {
    flex: 0.8,
    backgroundColor: "#FFFFFF",
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
    color: "#444",
    marginTop: 8,
  },
  value: {
    fontSize: 16,
    color: "#333",
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
