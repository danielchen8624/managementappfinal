import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Animated,
} from "react-native";
import React, { useState, useEffect } from "react";
import { Dropdown, MultiSelect } from "react-native-element-dropdown";
import { db, auth } from "../../firebaseConfig";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { useTheme } from "../ThemeContext";

const data = [
  { label: "Area of children", value: "Area of children" },
  { label: "Basket Ball", value: "Basket Ball" },
  { label: "BBQ Area", value: "BBQ Area" },
  { label: "Bicycle area", value: "Bicycle area" },
  { label: "Billiard Room", value: "Billiard Room" },
  { label: "Corridors & Staircase", value: "Corridors & Staircase" },
  { label: "Dog Room", value: "Dog Room" },
  { label: "Doors", value: "Doors" },
  { label: "Electrical Room", value: "Electrical Room" },
  { label: "Elevators", value: "Elevators" },
  { label: "Elevators (LD) - (HD)", value: "Elevators (LD) - (HD)" },
  { label: "Enter Lobby", value: "Enter Lobby" },
  { label: "Exterior Ground", value: "Exterior Ground" },
  { label: "Fire Box", value: "Fire Box" },
  { label: "Fire Boxes", value: "Fire Boxes" },
  { label: "Game Room", value: "Game Room" },
  { label: "Garage Chute", value: "Garage Chute" },
  { label: "General Vacuuming Carpet", value: "General Vacuuming Carpet" },
  { label: "Guess Suite", value: "Guess Suite" },
  { label: "Gym & Yoga room", value: "Gym & Yoga room" },
  { label: "Hallway", value: "Hallway" },
  { label: "Hallway lamps", value: "Hallway lamps" },
  { label: "Karaoke Room", value: "Karaoke Room" },
  { label: "Laundry & washroom", value: "Laundry & washroom" },
  { label: "Lockers Room", value: "Lockers Room" },
  { label: "Lounge Room", value: "Lounge Room" },
  { label: "Mail Boxes", value: "Mail Boxes" },
  { label: "Maintenance of all floors", value: "Maintenance of all floors" },
  { label: "Manager Office", value: "Manager Office" },
  {
    label: "Men & Women Washroom & Sauna",
    value: "Men & Women Washroom & Sauna",
  },
  { label: "Men's & Women's Gym", value: "Men's & Women's Gym" },
  { label: "Moving Room", value: "Moving Room" },
  { label: "Other", value: "Other" },
  { label: "Parking Area (in-out side)", value: "Parking Area (in-out side)" },
  { label: "Party Room", value: "Party Room" },
  { label: "Pool Area", value: "Pool Area" },
  { label: "Security Room", value: "Security Room" },
  { label: "Sprinkler System", value: "Sprinkler System" },
  { label: "Staff Room", value: "Staff Room" },
  { label: "Staircase", value: "Staircase" },
  { label: "Telecom Room", value: "Telecom Room" },
  { label: "Waiting Room", value: "Waiting Room" },
  {
    label: "Washroom (Men,Women & Security)",
    value: "Washroom (Men,Women & Security)",
  },
  { label: "Windows & Mirrors", value: "Windows & Mirrors" },
];

type TaskModalProps = {
  visible: boolean;
  onClose: () => void;
};

function TaskModal({ visible, onClose }: TaskModalProps) {
  const [taskAddress, setTaskAddress] = useState("");
  const [taskType, setTaskType] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [priority, setPriority] = useState<number | null>(null);
  const [urgent, setUrgent] = useState(false);
  const [important, setImportant] = useState(false);
  const [employees, setEmployees] = useState<
    { label: string; value: string }[]
  >([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const q = query(
          collection(db, "users"),
          where("role", "==", "employee")
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            label: data.firstName || data.email || "Unnamed",
            value: doc.id, // user ID
          };
        });
        setEmployees(list);
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };

    fetchEmployees();
  }, []);

  const handleSubmit = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("You must be logged in to submit a request.");
      return;
    }

    let finalPriority = priority;
    if (urgent && important) finalPriority = 1;
    else if (important && !urgent) finalPriority = 2;
    else if (urgent && !important) finalPriority = 3;
    else if (!urgent && !important) finalPriority = 4;

    if (!taskType.trim() || !taskDescription.trim() || !roomNumber.trim()) {
      Alert.alert("Please fill in all fields.");
      return;
    } else if (finalPriority === 4) {
      Alert.alert("Please select at least one priority option.");
      return;
    }

    try {
      await addDoc(collection(db, "tasks"), {
        taskAddress,
        taskType,
        description: taskDescription,
        roomNumber,
        priority: finalPriority,
        status:
          selectedAssignees.length > 0
            ? "assigned"
            : "pending",
        createdBy: currentUser.uid,
        createdAt: new Date(),
        assignedWorkers: selectedAssignees,
      });
      Alert.alert("Request Submitted!");
    } catch (error) {
      console.error("Error adding document: ", error);
    } finally {
      setTaskAddress("");
      setTaskType("");
      setTaskDescription("");
      setRoomNumber("");
      setPriority(null);
      setUrgent(false);
      setImportant(false);
      onClose();
    }
  };

  const ToggleSwitch = ({
    label,
    value,
    onToggle,
  }: {
    label: string;
    value: boolean;
    onToggle: () => void;
  }) => (
    <View style={styles.toggleRow}>
      <Text
        style={[styles.label, { flex: 1, color: isDark ? "#eee" : "#333" }]}
      >
        {label}
      </Text>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onToggle}
        style={[
          styles.toggleContainer,
          { backgroundColor: value ? "#22C55E" : isDark ? "#374151" : "#ccc" },
        ]}
      >
        <Animated.View
          style={[
            styles.toggleCircle,
            { transform: [{ translateX: value ? 22 : 0 }] },
          ]}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal animationType="slide" transparent={true} visible={visible}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF" },
          ]}
        >
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text
              style={[
                styles.closeButtonText,
                { color: isDark ? "#ccc" : "#888" },
              ]}
            >
              ×
            </Text>
          </TouchableOpacity>
          <Text style={[styles.label, { color: isDark ? "#eee" : "#333" }]}>
            Address
          </Text>
          <TextInput
            placeholder="Address"
            placeholderTextColor={isDark ? "#888" : "#aaa"}
            value={taskAddress}
            onChangeText={setTaskAddress}
            style={[
              styles.input,
              {
                backgroundColor: isDark ? "#2c2c2c" : "#fff",
                color: isDark ? "#fff" : "#000",
                borderColor: isDark ? "#555" : "#ccc",
              },
            ]}
          />

          <Dropdown
            style={[
              styles.dropdown,
              {
                borderColor: isDark ? "#555" : "#ccc",
                backgroundColor: isDark ? "#2c2c2c" : "#fff",
              },
            ]}
            placeholderStyle={{ color: isDark ? "#999" : "#999" }}
            selectedTextStyle={{ color: isDark ? "#fff" : "#000" }}
            itemTextStyle={{ color: isDark ? "#fff" : "#000" }}
            containerStyle={{ backgroundColor: isDark ? "#2a2a2a" : "#fff" }}
            data={data}
            labelField="label"
            valueField="value"
            placeholder="Select location"
            value={taskType}
            onChange={(item) => setTaskType(item.value)}
          />
          <Text style={{ color: isDark ? "#fff" : "#000", marginBottom: 8 }}>
            Assign to
          </Text>
          <MultiSelect
            style={{
              borderWidth: 1,
              borderColor: isDark ? "#555" : "#ccc",
              borderRadius: 8,
              padding: 10,
              backgroundColor: isDark ? "#2c2c2c" : "#fff",
              marginBottom: 16,
            }}
            placeholderStyle={{ color: isDark ? "#aaa" : "#999" }}
            selectedTextStyle={{ color: isDark ? "#fff" : "#000" }}
            itemTextStyle={{ color: isDark ? "#fff" : "#000" }}
            containerStyle={{ backgroundColor: isDark ? "#2a2a2a" : "#fff" }}
            data={employees}
            labelField="label"
            valueField="value"
            placeholder="Select employee(s)"
            value={selectedAssignees}
            onChange={(items) => setSelectedAssignees(items)}
          />

          <Text style={[styles.label, { color: isDark ? "#eee" : "#333" }]}>
            Room Number
          </Text>
          <TextInput
            placeholder="Room #"
            placeholderTextColor={isDark ? "#888" : "#aaa"}
            value={roomNumber}
            onChangeText={setRoomNumber}
            style={[
              styles.input,
              {
                backgroundColor: isDark ? "#2c2c2c" : "#fff",
                color: isDark ? "#fff" : "#000",
                borderColor: isDark ? "#555" : "#ccc",
              },
            ]}
          />

          <Text style={[styles.label, { color: isDark ? "#eee" : "#333" }]}>
            Description
          </Text>
          <TextInput
            placeholder="Description"
            placeholderTextColor={isDark ? "#888" : "#aaa"}
            value={taskDescription}
            onChangeText={setTaskDescription}
            style={[
              styles.input,
              {
                backgroundColor: isDark ? "#2c2c2c" : "#fff",
                color: isDark ? "#fff" : "#000",
                borderColor: isDark ? "#555" : "#ccc",
              },
            ]}
          />

          {/* Theme-aware toggles */}
          <ToggleSwitch
            label="Urgent"
            value={urgent}
            onToggle={() => setUrgent((prev) => !prev)}
          />
          <ToggleSwitch
            label="Important"
            value={important}
            onToggle={() => setImportant((prev) => !prev)}
          />

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Submit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default TaskModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
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
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    // color set inline per-theme where used
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  toggleContainer: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: "center",
  },
  toggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  submitButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    elevation: 3,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
