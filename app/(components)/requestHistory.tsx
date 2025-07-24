import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { router } from "expo-router";

type Request = {
  id: string;
  type: string;
  description: string;
  status: string;
  createdAt?: {
    toDate: () => Date;
  };
};

function RequestHistory() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [editingRequest, setEditingRequest] = useState<Request | null>(null);
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    fetchUserRequests();
  }, []);

  const fetchUserRequests = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const q = query(collection(db, "tasks"), where("createdBy", "==", userId));

    try {
      const snapshot = await getDocs(q);
      const userRequests: Request[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.taskType,
          description: data.description,
          status: data.status,
          createdAt: data.createdAt,
        };
      });

      userRequests.sort((a, b) => {
        const aDate = a.createdAt?.toDate?.() ?? new Date(0);
        const bDate = b.createdAt?.toDate?.() ?? new Date(0);
        return bDate.getTime() - aDate.getTime();
      });

      setRequests(userRequests);
    } catch (error) {
      console.error("Error fetching requests:", error);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this request?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "tasks", id));
            fetchUserRequests();
          } catch (error) {
            console.error("Failed to delete request:", error);
          }
        },
      },
    ]);
  };

  const handleEdit = (request: Request) => {
    setEditingRequest(request);
    setEditDescription(request.description);
  };

  const saveEdit = async () => {
    if (!editingRequest) return;
    try {
      await updateDoc(doc(db, "tasks", editingRequest.id), {
        description: editDescription,
      });
      setEditingRequest(null);
      fetchUserRequests();
    } catch (error) {
      console.error("Error updating request:", error);
    }
  };

  const goBack = () => router.back();

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={goBack} style={styles.historyButton}>
        <Text style={styles.historyButtonText}>Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {requests.length === 0 ? (
          <Text style={styles.emptyText}>You haven’t submitted any requests yet.</Text>
        ) : (
          requests.map((item) => (
            <View key={item.id} style={styles.taskCard}>
              <Text style={styles.taskTitle}>Type: {item.type}</Text>
              <Text style={styles.taskText}>Description: {item.description}</Text>
              <Text style={styles.taskText}>Status: {item.status}</Text>
              <Text style={styles.taskText}>
                Submitted: {item.createdAt?.toDate()?.toLocaleString() ?? "Unknown"}
              </Text>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionButton}>
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionButton}>
                  <Text style={[styles.actionText, { color: "red" }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={!!editingRequest} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Request</Text>
            <TextInput
              style={styles.modalInput}
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setEditingRequest(null)}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveEdit}>
                <Text style={{ color: "#007AFF" }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default RequestHistory;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  historyButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: "center",
    marginTop: 16,
    marginBottom: 8,
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
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  actionButton: {
    marginLeft: 16,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 32,
    fontSize: 16,
    color: "#888",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 12,
    width: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    minHeight: 60,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
});
