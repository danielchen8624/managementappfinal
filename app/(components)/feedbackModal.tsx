import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  TextInput,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import { useTheme } from "../ThemeContext";

const { height: SCREEN_H } = Dimensions.get("window");

const Pal = {
  light: {
    surface: "#FFFFFF",
    text: "#0F172A",
    textMuted: "#4B5563",
    outline: "#E6EAF0",
    subtle: "#F0F2F6",
    primary: "#1F4ED8",
  },
  dark: {
    surface: "#101826",
    text: "#E5E7EB",
    textMuted: "#9CA3AF",
    outline: "#334155",
    subtle: "#0F172A",
    primary: "#2563EB",
  },
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function FeedbackModal({ visible, onClose }: Props) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const C = isDark ? Pal.dark : Pal.light;
  const s = getStyles(isDark);

  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset input when opened
  useEffect(() => {
    if (visible) {
      setFeedback("");
      setSubmitting(false);
    }
  }, [visible]);

  const submitFeedback = async () => {
    const text = feedback.trim();
    if (!text) {
      onClose(); // empty -> just close
      return;
    }
    try {
      setSubmitting(true);
      const user = auth.currentUser;
      await addDoc(collection(db, "reviews"), {
        type: "text",
        text,
        uid: user?.uid ?? null,
        createdAt: serverTimestamp(),
      });
      setSubmitting(false);
      onClose();
      Alert.alert("Thanks!", "Your feedback has been recorded.");
    } catch (e) {
      setSubmitting(false);
      Alert.alert("Error", "Could not submit feedback. Please try again.");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        
        <View style={s.backdrop}>
          <View style={s.card}>
            <Text style={s.title}>Leave a Review</Text>
            <Text style={s.caption}>Tell us what you think…</Text>
            <TextInput
              placeholder="Your feedback (optional)"
              placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              style={s.input}
              multiline
              value={feedback}
              onChangeText={setFeedback}
            />
            <View style={s.row}>
              <TouchableOpacity
                onPress={onClose}
                style={[s.secondaryBtn]}
                activeOpacity={0.9}
                disabled={submitting}
              >
                <Text style={s.secondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitFeedback}
                disabled={submitting}
                style={[s.primaryBtn, submitting && { opacity: 0.7 }]}
                activeOpacity={0.9}
              >
                <Text style={s.primaryText}>
                  {submitting ? "Submitting…" : "Submit"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const getStyles = (isDark: boolean) => {
  const C = isDark ? Pal.dark : Pal.light;
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "flex-end",
    },
    card: {
      padding: 14,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: SCREEN_H * 0.6,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.outline,
      ...(Platform.OS === "ios"
        ? {
            shadowColor: "#000",
            shadowOpacity: isDark ? 0.18 : 0.08,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 8 },
          }
        : { elevation: 5 }),
    },
    title: {
      fontSize: 16,
      fontWeight: "900",
      color: C.text,
    },
    caption: {
      marginTop: 4,
      color: C.textMuted,
      fontWeight: "700",
      fontSize: 12,
    },
    input: {
      marginTop: 10,
      minHeight: 110,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.outline,
      color: C.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
      textAlignVertical: "top",
    },
    row: {
      flexDirection: "row",
      gap: 10,
      marginTop: 10,
    },
    secondaryBtn: {
      flex: 1,
      height: 48,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#0F172A" : "#F3F4F6",
      borderWidth: 1,
      borderColor: isDark ? "#1F2937" : "#E5E7EB",
    },
    secondaryText: {
      color: C.text,
      fontSize: 15,
      fontWeight: "800",
      letterSpacing: 0.2,
    },
    primaryBtn: {
      flex: 1,
      height: 48,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.primary,
      borderWidth: 1,
      borderColor: isDark ? "#1E3A8A" : "#183EA9",
    },
    primaryText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "900",
      letterSpacing: 0.2,
    },
  });
};
