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
} from "firebase/auth";
import { auth } from "../../firebaseConfig";
import { router, useLocalSearchParams } from "expo-router";
import { db } from "../../firebaseConfig";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useTheme } from "../ThemeContext"; 

export default function LoginScreen() {
  const params = useLocalSearchParams();
  const userType = params.role as string;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === "dark";

  const handleSignUp = async () => {
    console.log(userType);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        userID: user.uid,
        role: userType,
        email: email,
        createdAt: new Date(),
      });

      Alert.alert("Success!", "User registered.");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }

    try {
      const q = query(collection(db, "users"), where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert("Error", "No user found with this email.");
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const firestoreRole = userDoc.data().role;

      if (firestoreRole !== userType) {
        Alert.alert(
          "Access Denied",
          `This user is registered as "${firestoreRole}", not "${userType}". Please use the correct login option.`
        );
        return;
      }

      await signInWithEmailAndPassword(auth, email, password);
      Alert.alert("Success!", `Logged in as ${firestoreRole}.`);
    } catch (error: any) {
      Alert.alert("Login Failed", error.message);
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

          <TouchableOpacity
            onPress={() => router.replace("/selectLogin")}
            style={styles.backTextContainer}
          >
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
  container: {
    flex: 1,
  },
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
  secondaryButton: {
    backgroundColor: "#4CAF50",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  backTextContainer: {
    marginTop: 20,
  },
  backText: {
    fontSize: 14,
    textDecorationLine: "underline",
    textAlign: "center",
  },
});
