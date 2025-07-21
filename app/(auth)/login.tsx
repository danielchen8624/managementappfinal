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
import { collection, addDoc } from "firebase/firestore";

export default function LoginScreen() {
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignUp = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Add user to Firestore
      await addDoc(collection(db, "users"), {
        userID: user.uid,
        role: "user", // Default role, can be changed later
        email: email,
        createdAt: new Date(),
      });

      Alert.alert("Success!", "User registered.");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      Alert.alert("Success!", "Logged in.");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  // KeyboardAvoidingView moves components up away from keyboard if it is overlapped
  return (
    <SafeAreaView style = {{flex: 1, backgroundColor: "#F9FAFB"}}>
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title}>Login</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />

          <TouchableOpacity style={styles.button} onPress={handleSignUp}>
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleLogin}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.replace("../selectLogin")}
          style={styles.backTextContainer}
        >
          <Text style={styles.backText}>Back to Select Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
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
    backgroundColor: "#FFFFFF",
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
    color: "#111",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
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
    backgroundColor: "#4CAF50", // optional green alternative
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
    color: "#007AFF",
    textDecorationLine: "underline",
    textAlign: "center",
  },
});
