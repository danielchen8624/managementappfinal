import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  SafeAreaView,
  Animated,
  Easing,
  KeyboardAvoidingView,
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { router } from "expo-router";
import { useTheme } from "../ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "firebase/auth";

export default function SignUpInfo() {
  const uid = auth.currentUser?.uid || null;
  const email = auth.currentUser?.email || "";

  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const s = getStyles(isDark);

  const themeAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(themeAnim, {
      toValue: isDark ? 1 : 0,
      duration: 220,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [isDark, themeAnim]);

  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [birthday, setBirthday] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [saving, setSaving] = useState(false);

  const canContinue = useMemo(
    () => !!uid && firstName.trim().length > 0 && lastName.trim().length > 0,
    [uid, firstName, lastName]
  );

  const handleExit = async () => {
    try {
      await signOut(auth);
      router.replace("/(auth)/selectLogin");
    } catch (e: any) {
      Alert.alert("Couldn’t exit", e?.message || "Please try again.");
    }
  };

  const submit = async () => {
    if (!canContinue || saving) return;
    setSaving(true);
    try {
      const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const ref = doc(db, "users", uid!);

      await setDoc(ref, { userID: uid, email }, { merge: true });

      await updateDoc(ref, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName,
        birthday: birthday.trim() || null,
        employeeId: employeeId.trim() || null,
        signup_stage: "awaiting_profile_image",
        signup_complete: false,
      });

      router.replace("/(auth)/signUpPhoto");
    } catch (e: any) {
      console.error(e);
      Alert.alert("Couldn’t save info", e?.message || "Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!uid) {
    return (
      <SafeAreaView style={s.container}>
        <View
          style={[s.fill, { alignItems: "center", justifyContent: "center" }]}
        >
          <Text style={{ color: isDark ? "#E5E7EB" : "#111827" }}>
            You need to verify your email first.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#F8FAFC" }]} />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "#0F172A", opacity: themeAnim },
        ]}
      />

      {/* Header */}
      <View style={s.headerBar}>
        <TouchableOpacity
          onPress={handleExit}
          style={s.smallGreyBtn}
          accessibilityLabel="Exit onboarding"
        >
          <Ionicons name="close-outline" size={20} color={isDark ? "#F3F4F6" : "#111827"} />
        </TouchableOpacity>

        <Text style={s.headerTitle}>Your Details</Text>

        <TouchableOpacity
          onPress={toggleTheme}
          style={s.smallGreyBtn}
          accessibilityLabel="Toggle theme"
        >
          <Ionicons
            name={isDark ? "sunny-outline" : "moon-outline"}
            size={18}
            color={isDark ? "#FDE68A" : "#111827"}
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={s.fill}
      >
        <View style={s.body}>
          <View style={s.card}>
            <View style={s.emailPill}>
              <Ionicons name="mail-outline" size={14} color="#fff" />
              <Text numberOfLines={1} style={s.emailText}>
                {email || "your@email.com"}
              </Text>
            </View>

            <Text style={s.title}>Tell us about you</Text>
            <Text style={s.subTitle}>
              We’ll use this to personalize your experience and your account.
            </Text>

            <Text style={s.label}>First name</Text>
            <View style={s.inputWrap}>
              <Ionicons
                name="person-outline"
                size={18}
                color={isDark ? "#94A3B8" : "#64748B"}
              />
              <TextInput
                value={firstName}
                onChangeText={setFirst}
                style={s.input}
                placeholder="Jane"
                placeholderTextColor={isDark ? "#9CA3AF" : "#9AA1AA"}
                autoCapitalize="words"
              />
            </View>

            <Text style={s.label}>Last name</Text>
            <View style={s.inputWrap}>
              <Ionicons
                name="id-card-outline"
                size={18}
                color={isDark ? "#94A3B8" : "#64748B"}
              />
              <TextInput
                value={lastName}
                onChangeText={setLast}
                style={s.input}
                placeholder="Doe"
                placeholderTextColor={isDark ? "#9CA3AF" : "#9AA1AA"}
                autoCapitalize="words"
              />
            </View>

            <Text style={s.label}>Birthday (optional)</Text>
            <View style={s.inputWrap}>
              <Ionicons
                name="calendar-clear-outline"
                size={18}
                color={isDark ? "#94A3B8" : "#64748B"}
              />
              <TextInput
                value={birthday}
                onChangeText={setBirthday}
                style={s.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={isDark ? "#9CA3AF" : "#9AA1AA"}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <Text style={s.label}>Employee ID (optional)</Text>
            <View style={s.inputWrap}>
              <Ionicons
                name="briefcase-outline"
                size={18}
                color={isDark ? "#94A3B8" : "#64748B"}
              />
              <TextInput
                value={employeeId}
                onChangeText={setEmployeeId}
                style={s.input}
                placeholder="S12345"
                placeholderTextColor={isDark ? "#9CA3AF" : "#9AA1AA"}
                autoCapitalize="characters"
              />
            </View>

            <TouchableOpacity
              style={[
                s.primaryBtn,
                {
                  backgroundColor: canContinue
                    ? isDark
                      ? "#2563EB"
                      : "#1D4ED8"
                    : isDark
                    ? "#1E3A8A"
                    : "#93C5FD",
                },
              ]}
              disabled={!canContinue || saving}
              onPress={submit}
              activeOpacity={0.9}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name="arrow-forward-circle-outline"
                    size={18}
                    color="#fff"
                  />
                  <Text style={s.primaryBtnText}>Continue</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={s.helperText}>
              You can edit these later in Profile.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? "#0F172A" : "#F8FAFC" },
    fill: { flex: 1 },
    headerBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
    },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: 18,
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
    body: { flex: 1, paddingHorizontal: 16, paddingBottom: 20 },
    card: {
      marginTop: 8,
      backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
      borderRadius: 16,
      padding: 16,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 6,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#111827" : "transparent",
    },
    emailPill: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: isDark ? "#2563EB" : "#1D4ED8",
      marginBottom: 10,
      maxWidth: "100%",
    },
    emailText: {
      color: "#fff",
      fontWeight: "800",
      fontSize: 12,
      letterSpacing: 0.2,
      maxWidth: 240,
    },
    title: {
      fontSize: 20,
      fontWeight: "800",
      color: isDark ? "#F3F4F6" : "#0F172A",
    },
    subTitle: {
      marginTop: 6,
      color: isDark ? "#CBD5E1" : "#475569",
      fontSize: 14,
      marginBottom: 8,
    },
    label: {
      fontSize: 12,
      fontWeight: "800",
      marginTop: 10,
      marginBottom: 6,
      color: isDark ? "#C7D2FE" : "#1E3A8A",
      letterSpacing: 0.2,
    },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: isDark ? "#111827" : "#FFFFFF",
      borderColor: isDark ? "#1F2937" : "#E5E7EB",
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: isDark ? "#E5E7EB" : "#111827",
      padding: 0,
    },
    primaryBtn: {
      marginTop: 16,
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
    primaryBtnText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: 0.3,
    },
    helperText: {
      marginTop: 10,
      textAlign: "center",
      color: isDark ? "#94A3B8" : "#64748B",
      fontSize: 12,
      fontWeight: "600",
    },
  });
