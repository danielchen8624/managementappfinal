import React, { useEffect, useRef, useState } from "react";
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
  Keyboard,
  TouchableWithoutFeedback,
  Animated,
} from "react-native";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import { useTheme } from "../ThemeContext";
import { Ionicons } from "@expo/vector-icons";

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
  const s = getStyles(isDark);

  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const inputRef = useRef<TextInput>(null);

  // subtle header slide like your other modal
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  // Reset content on open
  useEffect(() => {
    if (visible) {
      setFeedback("");
      setSubmitting(false);
    }
  }, [visible]);

  const submitFeedback = async () => {
    const text = feedback.trim();
    if (!text) {
      Alert.alert("Feedback required", "Please enter your feedback before submitting.");
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
      Keyboard.dismiss();
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
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={s.overlay}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            inputRef.current?.blur();
            Keyboard.dismiss();
          }}
        >
          <View style={[s.sheet, { backgroundColor: isDark ? "#121826" : "#FFFFFF" }]}>
            {/* Header (X button, no Cancel) */}
            <Animated.View
              style={[
                s.headerRow,
                {
                  transform: [
                    {
                      translateY: slide.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-6, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={s.headerTitle}>Leave a Review</Text>
              <TouchableOpacity
                onPress={() => {
                  inputRef.current?.blur();
                  Keyboard.dismiss();
                  onClose();
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Close"
                style={s.iconBtn}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={isDark ? "#93A4B3" : "#6B7280"}
                />
              </TouchableOpacity>
            </Animated.View>

            <Text style={s.caption}>Tell us what you think…</Text>

            <TextInput
              ref={inputRef}
              placeholder="Your feedback"
              placeholderTextColor={isDark ? "#6B7280" : "#9CA3AF"}
              style={s.input}
              multiline
              value={feedback}
              onChangeText={setFeedback}
              returnKeyType="done"
              onSubmitEditing={submitFeedback}
              blurOnSubmit
            />

            {/* Single primary action (no Cancel button) */}
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
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const getStyles = (isDark: boolean) => {
  const C = isDark ? Pal.dark : Pal.light;
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "flex-end",
    },
    sheet: {
      maxHeight: SCREEN_H * 0.8,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 16,
      paddingBottom: 20,
      backgroundColor: C.surface,
      borderTopWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#0B1220" : "transparent",
      ...(Platform.OS === "ios"
        ? {
            shadowColor: "#000",
            shadowOpacity: isDark ? 0.18 : 0.08,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: -6 },
          }
        : { elevation: 8 }),
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: C.text,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#111827" : "#F3F4F6",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },
    caption: {
      marginTop: 2,
      color: C.textMuted,
      fontWeight: "700",
      fontSize: 12,
    },
    input: {
      marginTop: 10,
      minHeight: 110,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.outline,
      color: C.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
      textAlignVertical: "top",
    },
    primaryBtn: {
      marginTop: 12,
      height: 48,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.primary,
      borderWidth: 1,
      borderColor: isDark ? "#1E3A8A" : "#183EA9",
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 5,
    },
    primaryText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "900",
      letterSpacing: 0.2,
    },
  });
};
