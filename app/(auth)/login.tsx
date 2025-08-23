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
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { auth, db } from "../../firebaseConfig";
import { router, useLocalSearchParams } from "expo-router";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useTheme } from "../ThemeContext";
import { Ionicons } from "@expo/vector-icons";

export default function LoginScreen() {
  const params = useLocalSearchParams();
  const userType = (params.role as string) || "worker";

  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const s = getStyles(isDark);

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

  const roleLabel =
    userType === "manager"
      ? "Manager"
      : userType === "employee"
      ? "Employee"
      : userType;

  // --- AUTH FLOWS ---
  const handleSignUp = async () => {
    if (!canSubmit || working) return;
    setWorking("signup");
    const e = trimmedEmail;
    const p = trimmedPass;

    try {
      const methods = await fetchSignInMethodsForEmail(auth, e);
      if (methods.length && !methods.includes("password")) {
        Alert.alert(
          "Email in use",
          `This email is linked to: ${methods.join(", ")}. Sign in with that provider first, then set a password from your profile.`
        );
        setWorking(null);
        return;
      }

      const { user } = await createUserWithEmailAndPassword(auth, e, p);

      await setDoc(
        doc(db, "users", user.uid),
        {
          userID: user.uid,
          role: userType,
          email: e,
          createdAt: new Date(),
        },
        { merge: true }
      );

      Alert.alert("Success!", "User registered.");
    } catch (error: any) {
      Alert.alert("Sign Up Failed", error.code || error.message || "Try again.");
    } finally {
      setWorking(null);
    }
  };

  const handleLogin = async () => {
    if (!canSubmit || working) return;
    setWorking("login");
    const e = trimmedEmail;
    const p = trimmedPass;

    try {
      const { user } = await signInWithEmailAndPassword(auth, e, p);

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(
          ref,
          {
            userID: user.uid,
            email: e,
            role: userType,
            createdAt: new Date(),
          },
          { merge: true }
        );
      } else {
        const firestoreRole = snap.data()?.role;
        if (firestoreRole && firestoreRole !== userType) {
          Alert.alert(
            "Access Denied",
            `This user is registered as "${firestoreRole}", not "${userType}". Use the correct login option.`
          );
          setWorking(null);
          return;
        }
      }

      Alert.alert("Success!", "Logged in.");
    } catch (err: any) {
      if (err?.code === "auth/user-not-found") {
        try {
          const methods = await fetchSignInMethodsForEmail(auth, e);
          if (methods.length && !methods.includes("password")) {
            Alert.alert(
              "Use other provider",
              `This email is linked to: ${methods.join(", ")}. Sign in with that provider.`
            );
            setWorking(null);
            return;
          }
        } catch {}
      }
      Alert.alert("Login Failed", err?.code || err?.message || "Try again.");
    } finally {
      setWorking(null);
    }
  };

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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: "padding", android: undefined })}
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
            <Ionicons
              name={userType === "manager" ? "briefcase-outline" : "construct-outline"}
              size={14}
              color="#fff"
            />
            <Text style={s.rolePillText}>{roleLabel}</Text>
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
          keyboardShouldPersistTaps="handled"
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
              onPress={handleSignUp}
              disabled={!canSubmit || !!working}
              activeOpacity={0.9}
            >
              {working === "signup" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={18} color="#fff" />
                  <Text style={s.primaryBtnText}>Sign Up</Text>
                </>
              )}
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

const getStyles = (isDark: boolean) =>
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
      backgroundColor: userPillBg(isDark),
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
      justifyContent: "center",
      flexGrow: 1,
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

// helper to avoid style closure referencing props
function userPillBg(isDark: boolean) {
  return isDark ? "#2563EB" : "#1D4ED8";
}
