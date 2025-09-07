import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { router } from "expo-router";
import { useTheme } from "../ThemeContext";
import { Ionicons } from "@expo/vector-icons";
// NEW: building context
import { useBuilding } from "../BuildingContext";

function SendMessage() {
  const [messageTitle, setMessageTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  // NEW: toggle state
  const [sendGlobal, setSendGlobal] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const styles = getStyles(isDark);

  // read buildingId from context (matches your example)
  const { buildingId } = useBuilding();

  // THEME CROSSFADE
  const themeAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(themeAnim, {
      toValue: isDark ? 1 : 0,
      duration: 220,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [isDark, themeAnim]);

  const TITLE_MAX = 120;
  const BODY_MAX = 4000;

  const trimmedTitle = useMemo(() => messageTitle.trimStart(), [messageTitle]);
  const trimmedBody = useMemo(() => message.trimStart(), [message]);

  const isValid = trimmedTitle.trim().length > 0 && trimmedBody.trim().length > 0;

  const pushMessage = async () => {
    if (sending) return;

    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("You must be logged in to send messages.");
      return;
    }
    if (!isValid) {
      Alert.alert("Please add a title and message.");
      return;
    }
    if (!sendGlobal && !buildingId) {
      Alert.alert("No building selected", "Select a building or toggle Send globally.");
      return;
    }

    try {
      setSending(true);

      // Resolve firstName from /users/{uid} with fallbacks
      let firstName = "";
      try {
        const uref = doc(db, "users", currentUser.uid);
        const usnap = await getDoc(uref);
        if (usnap.exists()) {
          const udata = usnap.data() as any;
          firstName =
            (udata.firstName && String(udata.firstName)) ||
            (udata.name && String(udata.name).split(" ")[0]) ||
            (currentUser.displayName && currentUser.displayName.split(" ")[0]) ||
            (currentUser.email ? currentUser.email.split("@")[0] : "");
        } else {
          firstName =
            (currentUser.displayName && currentUser.displayName.split(" ")[0]) ||
            (currentUser.email ? currentUser.email.split("@")[0] : "");
        }
      } catch (e) {
        console.warn("Could not resolve firstName from /users:", e);
        firstName =
          (currentUser.displayName && currentUser.displayName.split(" ")[0]) ||
          (currentUser.email ? currentUser.email.split("@")[0] : "") ||
          currentUser.uid;
      }

      const colRef = sendGlobal
        ? collection(db, "global_messages")
        : collection(db, "buildings", String(buildingId), "messages");

      await addDoc(colRef, {
        title: trimmedTitle.slice(0, TITLE_MAX),
        content: trimmedBody.slice(0, BODY_MAX),

        // UPDATED FIELDS:
        createdBy: firstName,                          // 👈 show firstName instead of email
        author_email: currentUser.email || null,       // 👈 new field with email

        // Keep your existing metadata
        createdByName: currentUser.displayName || null,
        createdById: currentUser.uid,
        createdAt: serverTimestamp(),
        scope: sendGlobal ? "global" : "building",
        ...(sendGlobal ? {} : { buildingId: String(buildingId) }),
      });

      Alert.alert("Message Sent!");
      router.back();
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error sending message", error?.message || "Please try again.");
    } finally {
      setSending(false);
      setMessageTitle("");
      setMessage("");
      setSendGlobal(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* crossfade layers */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#F8FAFC" }]} />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "#0F172A", opacity: themeAnim },
        ]}
      />

      {/* Header */}
      <View style={styles.headerBar}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.smallGreyBtn}
            accessibilityLabel="Back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={isDark ? "#E5E7EB" : "#111827"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleTheme}
            style={styles.smallGreyBtn}
            accessibilityLabel="Toggle theme"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isDark ? "sunny-outline" : "moon-outline"}
              size={18}
              color={isDark ? "#FDE68A" : "#111827"}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.headerTitle}>Send Message</Text>

        {/* Spacer to balance header row */}
        <View style={{ width: 36, height: 36 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.formContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title field */}
          <View style={styles.fieldCard}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              placeholder="Message Title"
              value={messageTitle}
              onChangeText={(v) => setMessageTitle(v.slice(0, TITLE_MAX + 10))}
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? "#111827" : "#FFFFFF",
                  borderColor: isDark ? "#1F2937" : "#E5E7EB",
                  color: isDark ? "#E5E7EB" : "#111827",
                },
              ]}
              placeholderTextColor={isDark ? "#9CA3AF" : "#9AA1AA"}
              returnKeyType="next"
            />
            <View style={styles.counterRow}>
              <Text style={styles.hintText}>Make it clear & concise</Text>
              <Text style={styles.counterText}>
                {trimmedTitle.length}/{TITLE_MAX}
              </Text>
            </View>
          </View>

          {/* Content field */}
          <View style={styles.fieldCard}>
            <Text style={styles.label}>Message</Text>
            <TextInput
              placeholder="Message Content"
              value={message}
              onChangeText={(v) => setMessage(v.slice(0, BODY_MAX + 50))}
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: isDark ? "#111827" : "#FFFFFF",
                  borderColor: isDark ? "#1F2937" : "#E5E7EB",
                  color: isDark ? "#E5E7EB" : "#111827",
                },
              ]}
              placeholderTextColor={isDark ? "#9CA3AF" : "#9AA1AA"}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
            <View style={styles.counterRow}>
              <Text style={styles.hintText}>You can mention dates, shifts, etc.</Text>
              <Text style={styles.counterText}>
                {trimmedBody.length}/{BODY_MAX}
              </Text>
            </View>
          </View>

          {/* Send globally toggle (minimal, matches your tones) */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              onPress={() => setSendGlobal((v) => !v)}
              style={[
                styles.toggleBtn,
                {
                  backgroundColor: isDark ? "#111827" : "#E5E7EB",
                  borderColor: isDark ? "#1F2937" : "transparent",
                },
              ]}
              accessibilityLabel="Send globally"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              activeOpacity={0.9}
            >
              <Ionicons
                name={sendGlobal ? "checkmark-circle" : "ellipse-outline"}
                size={18}
                color={isDark ? "#C7D2FE" : "#1E3A8A"}
              />
            </TouchableOpacity>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: isDark ? "#C7D2FE" : "#1E3A8A",
              }}
            >
              Send globally
            </Text>
          </View>

          <TouchableOpacity
            onPress={pushMessage}
            disabled={!isValid || sending}
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  !isValid || sending
                    ? isDark
                      ? "#1E3A8A"
                      : "#93C5FD"
                    : isDark
                    ? "#2563EB"
                    : "#1D4ED8",
                opacity: !isValid || sending ? 0.8 : 1,
              },
            ]}
            activeOpacity={0.9}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>Send Message</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default SendMessage;

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
    },

    /* Header */
    headerBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: isDark ? "#F3F4F6" : "#111827",
      letterSpacing: 0.2,
    },
    smallGreyBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#111827" : "#E5E7EB",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },

    /* Form */
    formContainer: {
      paddingHorizontal: 16,
      paddingBottom: 24,
      paddingTop: 8,
      gap: 12,
    },
    fieldCard: {
      backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
      borderRadius: 16,
      padding: 14,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 6,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#111827" : "transparent",
    },
    label: {
      fontSize: 13,
      fontWeight: "800",
      color: isDark ? "#C7D2FE" : "#1E3A8A",
      marginBottom: 8,
      letterSpacing: 0.2,
    },
    input: {
      width: "100%",
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      fontSize: 16,
    },
    textArea: {
      height: 160,
      marginTop: 2,
    },

    counterRow: {
      marginTop: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    hintText: {
      fontSize: 12,
      color: isDark ? "#94A3B8" : "#64748B",
    },
    counterText: {
      fontSize: 12,
      fontWeight: "700",
      color: isDark ? "#CBD5E1" : "#475569",
    },

    // minimal row for the toggle
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 2,
      marginTop: 4,
      marginBottom: 4,
    },
    toggleBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: isDark ? 1 : 0,
    },

    sendButton: {
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 3,
      marginTop: 4,
    },
    sendButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: 0.3,
    },
  });
""