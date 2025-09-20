import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  TextInput,
  Text,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Animated,
  Easing,
  ActivityIndicator,
  Platform,
} from "react-native";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "../../firebaseConfig";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useTheme } from "../ThemeContext";
import { Ionicons } from "@expo/vector-icons";

/** ---------- roles & helpers ---------- */
type Role = "supervisor" | "manager" | "security" | "employee";

const ROLE_LIST: Role[] = ["supervisor", "manager", "security", "employee"];

function parseRole(raw: unknown): Role | null {
  if (typeof raw !== "string") return null;
  const lower = raw.toLowerCase();
  return (ROLE_LIST as string[]).includes(lower) ? (lower as Role) : null;
}

const ROLE_META: Record<
  Role,
  { label: string; icon: keyof typeof Ionicons.glyphMap; pillBgLight: string; pillBgDark: string }
> = {
  supervisor: {
    label: "Supervisor",
    icon: "people-circle-outline",
    pillBgLight: "#4338CA",
    pillBgDark: "#6366F1",
  },
  manager: {
    label: "Manager",
    icon: "briefcase-outline",
    pillBgLight: "#047857",
    pillBgDark: "#10B981",
  },
  security: {
    label: "Security",
    icon: "shield-checkmark-outline",
    pillBgLight: "#B45309",
    pillBgDark: "#F59E0B",
  },
  employee: {
    label: "Employee",
    icon: "construct-outline",
    pillBgLight: "#1D4ED8",
    pillBgDark: "#3B82F6",
  },
};

export default function LoginScreen() {
  const params = useLocalSearchParams();
  const selectedRole = parseRole(params.role);

  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const s = getStyles(isDark, selectedRole ?? "employee"); // style needs a color; won't be shown if invalid

  // if role is missing/invalid, bounce to selector immediately
  useEffect(() => {
    if (!selectedRole) {
      Alert.alert(
        "Select a role",
        "Please choose a login role to continue.",
        [{ text: "OK", onPress: () => router.replace("/selectLogin") }]
      );
    }
  }, [selectedRole]);

  // theme crossfade
  const themeAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(themeAnim, {
      toValue: isDark ? 1 : 0,
      duration: 220,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [isDark, themeAnim]);

  // form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [working, setWorking] = useState<null | "signup" | "login">(null);

  const trimmedEmail = useMemo(() => email.trim(), [email]);
  const trimmedPass = useMemo(() => password.trim(), [password]);
  const canSubmit = trimmedEmail.length > 0 && trimmedPass.length > 0;

  const roleMeta = selectedRole ? ROLE_META[selectedRole] : null;

  const safeBounceToSelector = () => {
    router.replace("/selectLogin");
  };

  const handleLogin = async () => {
    if (!selectedRole) {
      safeBounceToSelector();
      return;
    }
    if (!canSubmit || working) return;

    setWorking("login");
    const e = trimmedEmail;
    const p = trimmedPass;

    try {
      const { user } = await signInWithEmailAndPassword(auth, e, p);

      // STRICT: do not create user doc on login.
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await signOut(auth).catch(() => {});
        Alert.alert(
          "No Access",
          "Your account is not provisioned. Please contact your supervisor/manager or sign up via the correct flow."
        );
        setWorking(null);
        return;
      }

      const firestoreRole = parseRole(snap.data()?.role);
      if (!firestoreRole) {
        await signOut(auth).catch(() => {});
        Alert.alert(
          "Role Missing",
          "Your role is not configured. Please contact your supervisor/manager."
        );
        setWorking(null);
        return;
      }

      if (firestoreRole !== selectedRole) {
        await signOut(auth).catch(() => {});
        Alert.alert(
          "Access Denied",
          `This account is registered as "${ROLE_META[firestoreRole].label}". Please use the "${ROLE_META[firestoreRole].label}" login option.`
        );
        setWorking(null);
        return;
      }

      // success; proceed into app (your nav here)
    } catch (err: any) {
      Alert.alert("Login Failed", err?.code || err?.message || "Try again.");
    } finally {
      setWorking(null);
    }
  };

  // If role invalid, render nothing (alert will navigate)
  if (!selectedRole) {
    return null;
  }

  return (
    <SafeAreaView style={s.screen}>
      {/* crossfade layers */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#F8FAFC" }]} />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "#0F172A", opacity: themeAnim },
        ]}
      />

      {/* Use one thing to handle keyboard space (KAV). "height" avoids padding jumps. */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "height" : undefined}
        keyboardVerticalOffset={0} // adjust if you add a fixed header
      >
        {/* header */}
        <View style={s.headerBar}>
          <TouchableOpacity
            onPress={() => router.replace("/selectLogin")}
            style={s.smallGreyBtn}
            accessibilityLabel="Back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={isDark ? "#E5E7EB" : "#111827"}
            />
          </TouchableOpacity>

          <View style={s.rolePill}>
            <Ionicons name={roleMeta!.icon} size={14} color="#fff" />
            <Text style={s.rolePillText}>{roleMeta!.label}</Text>
          </View>

          <TouchableOpacity
            onPress={toggleTheme}
            style={s.smallGreyBtn}
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

        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="always"
          bounces={false}
          contentInsetAdjustmentBehavior="never"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        >
          <View style={s.card}>
            <Text style={s.title}>Login</Text>

            {/* Email */}
            <Text style={s.label}>Email</Text>
            <View style={s.inputWrap}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={isDark ? "#94A3B8" : "#64748B"}
              />
              <TextInput
                placeholder="you@example.com"
                placeholderTextColor={isDark ? "#9CA3AF" : "#9AA1AA"}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                style={[s.input]}
              />
            </View>

            {/* Password */}
            <Text style={s.label}>Password</Text>
            <View style={s.inputWrap}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={isDark ? "#94A3B8" : "#64748B"}
              />
              <TextInput
                placeholder="••••••••"
                placeholderTextColor={isDark ? "#9CA3AF" : "#9AA1AA"}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                style={[s.input]}
              />
              <TouchableOpacity onPress={() => setShowPw((v) => !v)}>
                <Ionicons
                  name={showPw ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={isDark ? "#B6C2CF" : "#475569"}
                />
              </TouchableOpacity>
            </View>

            {/* Actions */}
            <TouchableOpacity
              style={[
                s.primaryBtn,
                {
                  backgroundColor:
                    !canSubmit || working
                      ? isDark
                        ? "#1E3A8A"
                        : "#93C5FD"
                      : isDark
                      ? "#2563EB"
                      : "#1D4ED8",
                  opacity: !canSubmit || working ? 0.95 : 1,
                },
              ]}
              onPress={() =>
                router.replace({ pathname: "/signUp", params: { role: selectedRole } })
              }
              disabled={false}
              activeOpacity={0.9}
            >
              <>
                <Ionicons name="person-add-outline" size={18} color="#fff" />
                <Text style={s.primaryBtnText}>Sign Up</Text>
              </>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                s.secondaryBtn,
                {
                  backgroundColor:
                    !canSubmit || working
                      ? isDark
                        ? "#064E3B"
                        : "#A7F3D0"
                      : "#10B981",
                  opacity: !canSubmit || working ? 0.95 : 1,
                },
              ]}
              onPress={handleLogin}
              disabled={!canSubmit || !!working}
              activeOpacity={0.9}
            >
              {working === "login" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={18} color="#fff" />
                  <Text style={s.secondaryBtnText}>Login</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace("/selectLogin")}
              style={{ marginTop: 14, alignSelf: "center" }}
            >
              <Text style={s.backLink}>Back to Select Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean, role: Role) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
    },

    headerBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 8,
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
    rolePill: {
      flexDirection: "row",
      gap: 6,
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: isDark
        ? ROLE_META[role].pillBgDark
        : ROLE_META[role].pillBgLight,
    },
    rolePillText: {
      color: "#fff",
      fontWeight: "800",
      fontSize: 12,
      letterSpacing: 0.3,
    },

    scroll: {
      padding: 16,
      paddingTop: 20,
      paddingBottom: 24,
      alignItems: "center",
      // Avoid re-centering during keyboard animations:
      justifyContent: "flex-start",
      minHeight: "100%",
    },

    card: {
      width: "100%",
      maxWidth: 560,
      borderRadius: 16,
      padding: 16,
      backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 6,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#111827" : "transparent",
    },

    title: {
      fontSize: 22,
      fontWeight: "800",
      textAlign: "center",
      marginBottom: 14,
      color: isDark ? "#F3F4F6" : "#0F172A",
    },

    label: {
      fontSize: 12,
      fontWeight: "800",
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
      marginBottom: 14,
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
      marginTop: 6,
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

    secondaryBtn: {
      marginTop: 8,
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
    secondaryBtnText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: 0.3,
    },

    backLink: {
      fontSize: 14,
      textDecorationLine: "underline",
      color: isDark ? "#93C5FD" : "#1D4ED8",
      fontWeight: "700",
    },
  });
