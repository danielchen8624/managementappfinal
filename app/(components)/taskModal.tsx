import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Animated,
  Easing,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { Dropdown, MultiSelect } from "react-native-element-dropdown";
import { db, auth } from "../../firebaseConfig";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { useTheme } from "../ThemeContext";
import { Ionicons } from "@expo/vector-icons";

/* ---------- Location options ---------- */
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
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const s = getStyles(isDark);

  const [taskAddress, setTaskAddress] = useState("");
  const [taskType, setTaskType] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [important, setImportant] = useState(false);
  const [employees, setEmployees] = useState<{ label: string; value: string }[]>(
    []
  );
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // only avoid keyboard when description is focused
  const [isDescFocused, setIsDescFocused] = useState(false);

  // entry animation
  const sheetY = useRef(new Animated.Value(40)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(sheetY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sheetOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      sheetY.setValue(40);
      sheetOpacity.setValue(0);
    }
  }, [visible, sheetY, sheetOpacity]);

  // employees options
  useEffect(() => {
    (async () => {
      try {
        const qy = query(collection(db, "users"), where("role", "==", "employee"));
        const snapshot = await getDocs(qy);
        const list = snapshot.docs.map((doc) => {
          const d = doc.data() as any;
          return {
            label: d.firstName || d.name || d.email || "Unnamed",
            value: doc.id,
          };
        });
        setEmployees(list);
      } catch (e) {
        console.error("Error fetching employees:", e);
      }
    })();
  }, []);

  const finalPriority = useMemo(() => {
    if (urgent && important) return 1;
    if (!urgent && important) return 2;
    if (urgent && !important) return 3;
    return 4; // none
  }, [urgent, important]);

  const canSubmit =
    (taskType || "").trim().length > 0 &&
    (taskDescription || "").trim().length > 0 &&
    (roomNumber || "").trim().length > 0 &&
    finalPriority !== 4 &&
    !submitting;

  const resetForm = () => {
    setTaskAddress("");
    setTaskType("");
    setTaskDescription("");
    setRoomNumber("");
    setUrgent(false);
    setImportant(false);
    setSelectedAssignees([]);
  };

  const handleSubmit = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("You must be logged in to submit a request.");
      return;
    }
    if (!canSubmit) {
      Alert.alert("Please complete all required fields.");
      return;
    }

    try {
      setSubmitting(true);
      await addDoc(collection(db, "tasks"), {
        taskAddress,
        taskType,
        description: taskDescription,
        roomNumber,
        priority: finalPriority,
        status: selectedAssignees.length > 0 ? "assigned" : "pending",
        createdBy: currentUser.uid,
        createdAt: new Date(),
        assignedWorkers: selectedAssignees,
        forToday: true,
      });
      Alert.alert("Request Submitted!");
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error adding document: ", error);
      Alert.alert("Error", "Could not submit. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const Toggle = ({
    label,
    value,
    onToggle,
  }: {
    label: string;
    value: boolean;
    onToggle: () => void;
  }) => (
    <View style={s.toggleRow}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onToggle}
        style={[
          s.toggleTrack,
          { backgroundColor: value ? "#22C55E" : isDark ? "#374151" : "#D1D5DB" },
        ]}
      >
        <Animated.View
          style={[
            s.toggleThumb,
            { transform: [{ translateX: value ? 22 : 0 }] },
          ]}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={s.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: "padding", android: "height" })}
          keyboardVerticalOffset={Platform.select({ ios: 12, android: 0 })}
          style={{ width: "100%" }}
          enabled={isDescFocused} // <-- only avoid when description focused
        >
          <Animated.View
            style={[
              s.sheet,
              { transform: [{ translateY: sheetY }], opacity: sheetOpacity },
            ]}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={s.sheetContent}
              showsVerticalScrollIndicator={false}
            >
              {/* header */}
              <View style={s.sheetHeader}>
                <Text style={s.sheetTitle}>Add New Task</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={s.closeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="close"
                    size={20}
                    color={isDark ? "#93A4B3" : "#6B7280"}
                  />
                </TouchableOpacity>
              </View>

              {/* Address (optional) */}
              <Text style={s.label}>Address (optional)</Text>
              <TextInput
                placeholder="Address"
                placeholderTextColor={isDark ? "#9CA3AF" : "#9AA1AA"}
                value={taskAddress}
                onChangeText={setTaskAddress}
                style={s.input}
                returnKeyType="done"
                blurOnSubmit
              />

              {/* Location / Task Type */}
              <Text style={s.label}>Location</Text>
              <Dropdown
                style={s.dropdown}
                placeholderStyle={{ color: isDark ? "#9CA3AF" : "#9AA1AA" }}
                selectedTextStyle={{ color: isDark ? "#E5E7EB" : "#111827" }}
                itemTextStyle={{ color: isDark ? "#E5E7EB" : "#111827" }}
                containerStyle={{ backgroundColor: isDark ? "#0B1220" : "#FFFFFF" }}
                data={data}
                labelField="label"
                valueField="value"
                placeholder="Select location"
                value={taskType}
                onChange={(item: any) => setTaskType(item.value)}
              />

              {/* Assign to */}
              <Text style={s.label}>
                Assign to <Text style={s.labelHint}>(optional)</Text>
              </Text>
              <MultiSelect
                style={s.multi}
                placeholderStyle={{ color: isDark ? "#9CA3AF" : "#9AA1AA" }}
                selectedTextStyle={{ color: isDark ? "#E5E7EB" : "#111827" }}
                itemTextStyle={{ color: isDark ? "#E5E7EB" : "#111827" }}
                containerStyle={{ backgroundColor: isDark ? "#0B1220" : "#FFFFFF" }}
                data={employees}
                labelField="label"
                valueField="value"
                placeholder="Select employee(s)"
                value={selectedAssignees}
                onChange={(vals: string[]) => setSelectedAssignees(vals)}
              />

              {/* Room */}
              <Text style={s.label}>Room Number</Text>
              <TextInput
                placeholder="Room #"
                placeholderTextColor={isDark ? "#9CA3AF" : "#9AA1AA"}
                value={roomNumber}
                onChangeText={setRoomNumber}
                style={s.input}
                returnKeyType="done"
                blurOnSubmit
              />

              {/* Description */}
              <Text style={s.label}>Description</Text>
              <TextInput
                placeholder="What needs to be done?"
                placeholderTextColor={isDark ? "#9CA3AF" : "#9AA1AA"}
                value={taskDescription}
                onChangeText={setTaskDescription} // allow natural newlines
                style={[s.input, { height: 112, textAlignVertical: "top" }]}
                multiline
                blurOnSubmit={false}           // keep keyboard up
                returnKeyType="default"        // iOS: show return; Android: normal
                onFocus={() => setIsDescFocused(true)}
                onBlur={() => setIsDescFocused(false)}
              />

              {/* Toggles */}
              <Toggle
                label="Urgent"
                value={urgent}
                onToggle={() => setUrgent((v) => !v)}
              />
              <Toggle
                label="Important"
                value={important}
                onToggle={() => setImportant((v) => !v)}
              />

              {/* Submit */}
              <TouchableOpacity
                style={[
                  s.submitBtn,
                  {
                    backgroundColor:
                      !canSubmit || submitting
                        ? isDark
                          ? "#1E3A8A"
                          : "#93C5FD"
                        : isDark
                        ? "#2563EB"
                        : "#1D4ED8",
                    opacity: !canSubmit || submitting ? 0.9 : 1,
                  },
                ]}
                onPress={handleSubmit}
                disabled={!canSubmit || submitting}
                activeOpacity={0.9}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send-outline" size={18} color="#fff" />
                    <Text style={s.submitText}>Submit</Text>
                  </>
                )}
              </TouchableOpacity>
              <View style={{ height: 8 }} />
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default TaskModal;

/* ---------- styles ---------- */
const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "flex-end",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingBottom: 12,
    },
    sheet: {
      width: "100%",
      borderRadius: 16,
      backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
      shadowColor: "#000",
      shadowOpacity: 0.16,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 10,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#111827" : "transparent",
      overflow: "hidden",
    },
    sheetContent: {
      padding: 14,
      paddingBottom: 12,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    sheetTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: isDark ? "#F3F4F6" : "#0F172A",
      letterSpacing: 0.2,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#111827" : "#E5E7EB",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },

    label: {
      fontSize: 12,
      fontWeight: "800",
      marginTop: 8,
      marginBottom: 6,
      color: isDark ? "#C7D2FE" : "#1E3A8A",
      letterSpacing: 0.2,
    },
    labelHint: {
      fontSize: 12,
      fontWeight: "700",
      color: isDark ? "#94A3B8" : "#64748B",
    },

    input: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginBottom: 8,
      fontSize: 14,
      backgroundColor: isDark ? "#111827" : "#FFFFFF",
      borderColor: isDark ? "#1F2937" : "#E5E7EB",
      color: isDark ? "#E5E7EB" : "#111827",
    },

    dropdown: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginBottom: 8,
      backgroundColor: isDark ? "#111827" : "#FFFFFF",
      borderColor: isDark ? "#1F2937" : "#E5E7EB",
    },
    multi: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 10,
      backgroundColor: isDark ? "#111827" : "#FFFFFF",
      borderColor: isDark ? "#1F2937" : "#E5E7EB",
      marginBottom: 8,
    },

    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 6,
      marginBottom: 4,
      gap: 12,
    },
    fieldLabel: {
      flex: 1,
      fontSize: 13,
      fontWeight: "800",
      color: isDark ? "#E5E7EB" : "#111827",
    },
    toggleTrack: {
      width: 44,
      height: 24,
      borderRadius: 12,
      padding: 2,
      justifyContent: "center",
    },
    toggleThumb: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: "#fff",
    },

    submitBtn: {
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 3,
    },
    submitText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: 0.3,
    },
  });
