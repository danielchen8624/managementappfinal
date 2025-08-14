import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import { useTheme } from "../ThemeContext";

type ReportModalProps = {
  visible: boolean;
  onClose: () => void;
};

export default function ReportModal({ visible, onClose }: ReportModalProps) {
  const [title, setTitle] = useState("");
  const [aptNumber, setAptNumber] = useState("");
  const [description, setDescription] = useState("");
  const [isFixed, setIsFixed] = useState(false);
  const [needsHelp, setNeedsHelp] = useState(false);

  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Slide toggle used for "Fixed" and "Need assistance"
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

  const handleSubmit = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("You must be logged in to submit a report.");
      return;
    }
    if (!title.trim() || !description.trim()) {
      Alert.alert("Please add a title and description.");
      return;
    }
    if (isFixed && needsHelp) {
      Alert.alert('Choose either "Fixed" or "Need assistance", not both.');
      return;
    }
    const status = isFixed ? "fixed" : needsHelp ? "need_assistance" : "open";

    try {
      await addDoc(collection(db, "reports"), {
        title: title.trim(),
        description: description.trim(),
        aptNumber: aptNumber.trim() || null,
        status, // "fixed" | "need_assistance" | "open"
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        visibility: "manager_supervisor", // employees don't see others' reports. do i need this?
        managerHasReviewed: false,
      });

      Alert.alert("Report submitted");
    } catch (e) {
      console.error("Failed to submit report:", e);
      Alert.alert("Error", "Could not submit report. Try again.");
    } finally {
      setTitle("");
      setAptNumber("");
      setDescription("");
      setIsFixed(false);
      setNeedsHelp(false);
      onClose();
    }
  };

  // Make toggles mutually exclusive
  const onToggleFixed = () => {
    setIsFixed((prev) => {
      const next = !prev;
      if (next) setNeedsHelp(false);
      return next;
    });
  };
  const onToggleNeedsHelp = () => {
    setNeedsHelp((prev) => {
      const next = !prev;
      if (next) setIsFixed(false);
      return next;
    });
  };

  return (
    <KeyboardAvoidingView style={{ width: "100%" }}>
      <Modal animationType="slide" transparent visible={visible}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: isDark ? "#1E1E1E" : "#FFFFFF" },
            ]}
          >
            {/* Close */}
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

            {/* Title */}
            <Text style={[styles.label, { color: isDark ? "#eee" : "#333" }]}>
              Issue Title
            </Text>
            <TextInput
              placeholder="Short title (e.g., Outlet not working)"
              placeholderTextColor={isDark ? "#888" : "#999"}
              value={title}
              onChangeText={setTitle}
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? "#2c2c2c" : "#fff",
                  color: isDark ? "#fff" : "#000",
                  borderColor: isDark ? "#555" : "#ccc",
                },
              ]}
            />

            {/* Apartment # */}
            <Text style={[styles.label, { color: isDark ? "#eee" : "#333" }]}>
              Apartment #
            </Text>
            <TextInput
              placeholder="e.g., 1205 (optional)"
              placeholderTextColor={isDark ? "#888" : "#999"}
              value={aptNumber}
              onChangeText={setAptNumber}
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? "#2c2c2c" : "#fff",
                  color: isDark ? "#fff" : "#000",
                  borderColor: isDark ? "#555" : "#ccc",
                },
              ]}
            />

            {/* Description */}
            <Text style={[styles.label, { color: isDark ? "#eee" : "#333" }]}>
              Description
            </Text>

            <TextInput
              placeholder="Describe the issue…"
              placeholderTextColor={isDark ? "#888" : "#999"}
              value={description}
              // if the last char typed is a newline, remove it and dismiss
              onChangeText={(t) => {
                if (t.endsWith("\n")) {
                  setDescription(t.replace(/\n/g, ""));
                  Keyboard.dismiss();
                } else {
                  setDescription(t);
                }
              }}
              // iOS shows a Done key; some Android keyboards still send newline
              returnKeyType="done"
              // iOS will call this; Android might not—kept as a no-op fallback
              onSubmitEditing={() => Keyboard.dismiss()}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === "Enter") Keyboard.dismiss();
              }}
              multiline
              numberOfLines={4}
              style={[
                styles.input,
                {
                  minHeight: 90,
                  textAlignVertical: "top",
                  backgroundColor: isDark ? "#2c2c2c" : "#fff",
                  color: isDark ? "#fff" : "#000",
                  borderColor: isDark ? "#555" : "#ccc",
                },
              ]}
            />

            {/* Toggles */}
            <View style={{ marginTop: 4 }}>
              <ToggleSwitch
                label="Fixed"
                value={isFixed}
                onToggle={onToggleFixed}
              />
              <ToggleSwitch
                label="Need assistance"
                value={needsHelp}
                onToggle={onToggleNeedsHelp}
              />
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              activeOpacity={0.9}
            >
              <Text style={styles.submitButtonText}>Submit Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  modalContainer: {
    width: "100%",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  closeButton: { alignSelf: "flex-end", marginBottom: 8 },
  closeButtonText: { fontSize: 28, lineHeight: 28 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    fontSize: 14,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
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
    marginTop: 10,
    elevation: 3,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
