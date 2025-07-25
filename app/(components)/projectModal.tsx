import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import React, { useState } from "react";
import { Dropdown } from "react-native-element-dropdown";
import { db, auth } from "../../firebaseConfig";
import { collection, addDoc } from "firebase/firestore";

const data = [
  { label: "Area of children", value: "Area of children", priority: 2 },
  { label: "Basket Ball", value: "Basket Ball", priority: 2 },
  { label: "BBQ Area", value: "BBQ Area", priority: 2 },
  { label: "Bicycle area", value: "Bicycle area", priority: 3 },
  { label: "Billiard Room", value: "Billiard Room", priority: 2 },
  { label: "Corridors & Staircase", value: "Corridors & Staircase", priority: 1 },
  { label: "Dog Room", value: "Dog Room", priority: 2 },
  { label: "Doors", value: "Doors", priority: 3 },
  { label: "Electrical Room", value: "Electrical Room", priority: 3 },
  { label: "Elevators", value: "Elevators", priority: 2 },
  { label: "Elevators (LD) - (HD)", value: "Elevators (LD) - (HD)", priority: 1 },
  { label: "Enter Lobby", value: "Enter Lobby", priority: 1 },
  { label: "Exterior Ground", value: "Exterior Ground", priority: 2 },
  { label: "Fire Box", value: "Fire Box", priority: 3 },
  { label: "Fire Boxes", value: "Fire Boxes", priority: 1 },
  { label: "Game Room", value: "Game Room", priority: 2 },
  { label: "Garage Chute", value: "Garage Chute", priority: 1 },
  { label: "General Vacuuming Carpet", value: "General Vacuuming Carpet", priority: 1 },
  { label: "Guess Suite", value: "Guess Suite", priority: 3 },
  { label: "Gym & Yoga room", value: "Gym & Yoga room", priority: 2 },
  { label: "Hallway", value: "Hallway", priority: 2 },
  { label: "Hallway lamps", value: "Hallway lamps", priority: 3 },
  { label: "Karaoke Room", value: "Karaoke Room", priority: 2 },
  { label: "Laundry & washroom", value: "Laundry & washroom", priority: 1 },
  { label: "Lockers Room", value: "Lockers Room", priority: 3 },
  { label: "Lounge Room", value: "Lounge Room", priority: 2 },
  { label: "Mail Boxes", value: "Mail Boxes", priority: 1 },
  { label: "Maintenance of all floors", value: "Maintenance of all floors", priority: 2 },
  { label: "Manager Office", value: "Manager Office", priority: 1 },
  { label: "Men & Women Washroom & Sauna", value: "Men & Women Washroom & Sauna", priority: 1 },
  { label: "Men's & Women's Gym", value: "Men's & Women's Gym", priority: 1 },
  { label: "Moving Room", value: "Moving Room", priority: 3 },
  { label: "Other", value: "Other", priority: 3 },
  { label: "Parking Area (in-out side)", value: "Parking Area (in-out side)", priority: 1 },
  { label: "Party Room", value: "Party Room", priority: 2 },
  { label: "Pool Area", value: "Pool Area", priority: 2 },
  { label: "Security Room", value: "Security Room", priority: 1 },
  { label: "Sprinkler System", value: "Sprinkler System", priority: 3 },
  { label: "Staff Room", value: "Staff Room", priority: 2 },
  { label: "Staircase", value: "Staircase", priority: 3 },
  { label: "Telecom Room", value: "Telecom Room", priority: 3 },
  { label: "Waiting Room", value: "Waiting Room", priority: 1 },
  { label: "Washroom (Men,Women & Security)", value: "Washroom (Men,Women & Security)", priority: 1 },
  { label: "Windows & Mirrors", value: "Windows & Mirrors", priority: 1 },
];

type ProjectModalProps = {
  visible: boolean;
  onClose: () => void;
};

function ProjectModal({ visible, onClose }: ProjectModalProps) {
  const [taskType, setTaskType] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [priority, setPriority] = useState<number | null>(null);

  const handleSubmit = async () => {
    const currentUser = auth.currentUser;
  if (!currentUser) {
    Alert.alert("You must be logged in to submit a request.");
    return;
  }
    try {
      console.log("hai");
      await addDoc(collection(db, "projects"), {
        taskType,
        description: taskDescription,
        roomNumber,
        priority,
        status: "pending",
        createdBy: currentUser.uid,
        createdAt: new Date(),
        assignedWorkers: null //manager can assign to specific workers later, so change null into a state that holds array of worker ids that manager sets

      });
      Alert.alert("Project Added!");
    } catch (error) {
      console.error("Error adding document: ", error);
    } finally {
      setTaskType("");
      setTaskDescription("");
      setRoomNumber("");
      setPriority(null);
      onClose();
    }
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>

          <Dropdown
            style={styles.dropdown}
            data={data}
            labelField="label"
            valueField="value"
            placeholder="Select location"
            value={taskType}
            onChange={(item) => {
              setTaskType(item.value);
              setPriority(item.priority);
            }}
          />

          <Text style={styles.label}>Room Number</Text>
          <TextInput
            placeholder="Room #"
            value={roomNumber}
            onChangeText={setRoomNumber}
            style={styles.input}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            placeholder="Description"
            value={taskDescription}
            onChangeText={setTaskDescription}
            style={styles.input}
          />

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Submit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default ProjectModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  closeButton: {
    alignSelf: "flex-end",
    marginBottom: 12,
  },
  closeButtonText: {
    fontSize: 24,
    color: "#888",
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    elevation: 3,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
