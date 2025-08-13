import React, { useState } from "react";
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

export default function LoginScreen() {
  const params = useLocalSearchParams();
  const userType = (params.role as string) || "worker";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const handleSignUp = async () => {
    const e = email.trim();
    const p = password.trim();
    if (!e || !p) {
      Alert.alert("Error", "Please enter email and password.");
      return;
    }

    try {
      const methods = await fetchSignInMethodsForEmail(auth, e);
      if (methods.length && !methods.includes("password")) {
        Alert.alert(
          "Email in use",
          `This email is linked to ${methods.join(", ")}. Sign in with that provider, then set a password from your profile.`
        );
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
      Alert.alert("Sign Up Failed", error.code || error.message);
    }
  };

  const handleLogin = async () => {
    const e = email.trim();
    const p = password.trim();
    if (!e || !p) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }

    try {
      const { user } = await signInWithEmailAndPassword(auth, e, p);

      // get/create profile AFTER Auth
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
          return;
        }
      }

      Alert.alert("Success!", "Logged in.");
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        const methods = await fetchSignInMethodsForEmail(auth, e);
        if (methods.length && !methods.includes("password")) {
          Alert.alert(
            "Use other provider",
            `This email is linked to ${methods.join(", ")}. Sign in with that provider.`
          );
          return;
        }
      }
      Alert.alert("Login Failed", err.code || err.message);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#111827" : "#F9FAFB" }}>
      <KeyboardAvoidingView style={styles.container} behavior="padding">
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={[styles.card, { backgroundColor: isDark ? "#1e1e1e" : "#FFFFFF" }]}>
            <Text style={[styles.title, { color: isDark ? "#fff" : "#111" }]}>Login</Text>

            <Text style={[styles.label, { color: isDark ? "#ccc" : "#333" }]}>Email</Text>
            <TextInput
              placeholder="Email"
              placeholderTextColor={isDark ? "#aaa" : "#999"}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? "#2c2c2c" : "#fff",
                  borderColor: isDark ? "#555" : "#ccc",
                  color: isDark ? "#eee" : "#000",
                },
              ]}
            />

            <Text style={[styles.label, { color: isDark ? "#ccc" : "#333" }]}>Password</Text>
            <TextInput
              placeholder="Password"
              placeholderTextColor={isDark ? "#aaa" : "#999"}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? "#2c2c2c" : "#fff",
                  borderColor: isDark ? "#555" : "#ccc",
                  color: isDark ? "#eee" : "#000",
                },
              ]}
            />

            <TouchableOpacity style={styles.button} onPress={handleSignUp}>
              <Text style={styles.buttonText}>Sign Up</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleLogin}
            >
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => router.replace("/selectLogin")} style={styles.backTextContainer}>
            <Text style={[styles.backText, { color: isDark ? "#93c5fd" : "#007AFF" }]}>
              Back to Select Login
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    padding: 20,
    paddingTop: 30,
    paddingBottom: 30,
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
  },
  card: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    elevation: 3,
  },
  secondaryButton: { backgroundColor: "#4CAF50" },
  buttonText: { color: "white", fontSize: 16, fontWeight: "600" },
  backTextContainer: { marginTop: 20 },
  backText: {
    fontSize: 14,
    textDecorationLine: "underline",
    textAlign: "center",
  },
});
