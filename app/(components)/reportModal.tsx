import React, { useRef, useState } from "react";
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
  Platform,
  TouchableWithoutFeedback,
} from "react-native";
import { addDoc, collection, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import { useTheme } from "../ThemeContext";
import { useBuilding } from "../BuildingContext"; // current building

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
  const [submitting, setSubmitting] = useState(false);

  const { theme } = useTheme();
  const isDark = theme === "dark";
  const s = getStyles(isDark);

  // current building
  const { buildingId } = useBuilding();

  const descRef = useRef<TextInput>(null);

  const ToggleSwitch = ({
    label,
    value,
    onToggle,
  }: {
    label: string;
    value: boolean;
    onToggle: () => void;
  }) => {
    const translate = new Animated.Value(value ? 22 : 0);
    Animated.timing(translate, {
      toValue: value ? 22 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();

    return (
      <View style={s.toggleRow}>
        <Text style={[s.label, { flex: 1 }]}>{label}</Text>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            descRef.current?.blur();
            Keyboard.dismiss();
            onToggle();
          }}
          style={[
            s.toggleContainer,
            { backgroundColor: value ? "#22C55E" : isDark ? "#374151" : "#D1D5DB" },
          ]}
        >
          <Animated.View
            style={[s.toggleCircle, { transform: [{ translateX: translate }] }]}
          />
        </TouchableOpacity>
      </View>
    );
  };

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

  const handleSubmit = async () => {
    if (submitting) return;

    descRef.current?.blur();
    Keyboard.dismiss();

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("You must be logged in to submit a report.");
      return;
    }
    if (!buildingId) {
      Alert.alert("Select a building first", "Reports are scoped per building.");
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
      setSubmitting(true);

      // 🔑 fetch reporter_name from users/{uid}
      let reporter_name: string | null = null;
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data() as any;
          reporter_name = data.firstName ?? null;
        }
      } catch (err) {
        console.error("Failed to fetch reporter_name:", err);
      }

      await addDoc(collection(db, "buildings", buildingId, "reports"), {
        title: title.trim(),
        description: description.trim(),
        aptNumber: aptNumber.trim() || null,
        status,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        visibility: "manager_supervisor",
        managerHasReviewed: false,
        buildingId,
        reporter_name, // 👈 add reporter_name here
      });

      Alert.alert("Report submitted");
      setTitle("");
      setAptNumber("");
      setDescription("");
      setIsFixed(false);
      setNeedsHelp(false);
      onClose();
    } catch (e) {
      console.error("Failed to submit report:", e);
      Alert.alert("Error", "Could not submit report. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={s.overlay}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            descRef.current?.blur();
            Keyboard.dismiss();
          }}
        >
          <View style={[s.sheet, { backgroundColor: isDark ? "#121826" : "#FFFFFF" }]}>
            {/* Header */}
            <View style={s.headerRow}>
              <Text style={s.headerTitle}>New Report</Text>
              <TouchableOpacity
                onPress={() => {
                  descRef.current?.blur();
                  Keyboard.dismiss();
                  onClose();
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={s.close}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Title */}
            <Text style={s.label}>Issue Title</Text>
            <TextInput
              placeholder="Short title (e.g., Outlet not working)"
              placeholderTextColor={isDark ? "#9CA3AF" : "#9AA0A6"}
              value={title}
              onChangeText={setTitle}
              style={[
                s.input,
                {
                  backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
                  borderColor: isDark ? "#374151" : "#E5E7EB",
                  color: isDark ? "#F9FAFB" : "#111827",
                },
              ]}
              returnKeyType="next"
            />

            {/* Apartment # */}
            <Text style={s.label}>Apartment #</Text>
            <TextInput
              placeholder="e.g., 1205 (optional)"
              placeholderTextColor={isDark ? "#9CA3AF" : "#9AA0A6"}
              value={aptNumber}
              onChangeText={setAptNumber}
              style={[
                s.input,
                {
                  backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
                  borderColor: isDark ? "#374151" : "#E5E7EB",
                  color: isDark ? "#F9FAFB" : "#111827",
                },
              ]}
              keyboardType="numbers-and-punctuation"
              returnKeyType="next"
            />

            {/* Description */}
            <Text style={s.label}>Description</Text>
            <TextInput
              ref={descRef}
              placeholder="Describe the issue…"
              placeholderTextColor={isDark ? "#9CA3AF" : "#9AA0A6"}
              value={description}
              onChangeText={setDescription}
              returnKeyType="done"
              multiline
              numberOfLines={4}
              blurOnSubmit
              onSubmitEditing={() => {
                descRef.current?.blur();
                Keyboard.dismiss();
              }}
              style={[
                s.input,
                s.textarea,
                {
                  backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
                  borderColor: isDark ? "#374151" : "#E5E7EB",
                  color: isDark ? "#F9FAFB" : "#111827",
                },
              ]}
            />

            {/* Toggles */}
            <View style={{ marginTop: 4 }}>
              <ToggleSwitch label="Fixed" value={isFixed} onToggle={onToggleFixed} />
              <ToggleSwitch label="Need assistance" value={needsHelp} onToggle={onToggleNeedsHelp} />
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[s.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              activeOpacity={0.9}
              disabled={submitting}
            >
              <Text style={s.submitText}>
                {submitting ? "Submitting…" : "Submit Report"}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "flex-end",
    },
    sheet: {
      maxHeight: "92%",
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 16,
      paddingBottom: 24,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: -2 },
      elevation: 10,
      borderTopWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#0B1220" : "transparent",
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: isDark ? "#E5E7EB" : "#111827",
    },
    close: {
      fontSize: 28,
      lineHeight: 28,
      color: isDark ? "#93A4B3" : "#6B7280",
    },

    label: {
      fontSize: 13,
      fontWeight: "700",
      marginTop: 10,
      marginBottom: 6,
      color: isDark ? "#CBD5E1" : "#374151",
    },
    input: {
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      fontSize: 14,
      marginBottom: 12,
    },
    textarea: {
      minHeight: 96,
      textAlignVertical: "top",
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

    submitBtn: {
      marginTop: 12,
      backgroundColor: isDark ? "#2563EB" : "#1D4ED8",
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 5,
    },
    submitText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: 0.3,
    },
  });
