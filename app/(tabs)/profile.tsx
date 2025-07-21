import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import React from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/firebaseConfig";
import { router } from "expo-router";

function ProfileScreen() {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      Alert.alert("Success!", "Logged Out.");
    } catch (error) {
      Alert.alert("Error", "Please Try Again.");
    }
  };

  const editProfile = () => {
    if (auth.currentUser != null) {
      router.push("/editProfile");
    }
  };

  return (
    <View style={styles.container}>
        <Text style={styles.header}>Profile</Text>
        <TouchableOpacity style={styles.button} onPress={editProfile}>
          <Text style={styles.buttonText}>Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.logout]} onPress={handleLogout}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
    </View>
  );
}

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    flex: .5,
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    alignItems: "center",
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 24,
    color: "#333",
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 12,
    width: "100%",
    alignItems: "center",
    elevation: 3,
  },
  logout: {
    backgroundColor: "#f44336",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
