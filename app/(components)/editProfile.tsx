import React, { useState } from "react";
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Image,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../ThemeContext";

function EditProfile() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const { theme } = useTheme();
  const isDark = theme === "dark";
  const userId = auth.currentUser?.uid;

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const updateUser = async () => {
    if (!userId) {
      console.error("User ID is not available");
      return;
    }

    const userRef = doc(db, "users", userId);

    try {
      await setDoc(
        userRef,
        {
          firstName,
          lastName,
          birthday,
          employeeId,
        },
        { merge: true }
      );
      Alert.alert("Changes Saved!");
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Please try again.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        { backgroundColor: isDark ? "#121212" : "#F9FAFB" },
      ]}
      behavior="padding"
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {profileImage && (
          <Image
            source={{ uri: profileImage }}
            style={[
              styles.avatar,
              { borderColor: isDark ? "#444" : "#ddd", borderWidth: 1 },
            ]}
          />
        )}

        <View
          style={[
            styles.card,
            { backgroundColor: isDark ? "#1e1e1e" : "#FFFFFF" },
          ]}
        >
          <TouchableOpacity onPress={pickImage}>
            <Text style={[styles.changePhoto, { color: "#007AFF" }]}>
              Change Profile Picture
            </Text>
          </TouchableOpacity>

          <Text style={[styles.label, { color: isDark ? "#ccc" : "#333" }]}>
            First Name
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? "#2a2a2a" : "#fff",
                borderColor: isDark ? "#555" : "#ccc",
                color: isDark ? "#fff" : "#111",
              },
            ]}
            placeholder="First Name"
            placeholderTextColor={isDark ? "#888" : "#999"}
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="sentences"
          />

          <Text style={[styles.label, { color: isDark ? "#ccc" : "#333" }]}>
            Last Name
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? "#2a2a2a" : "#fff",
                borderColor: isDark ? "#555" : "#ccc",
                color: isDark ? "#fff" : "#111",
              },
            ]}
            placeholder="Last Name"
            placeholderTextColor={isDark ? "#888" : "#999"}
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="sentences"
          />

          <Text style={[styles.label, { color: isDark ? "#ccc" : "#333" }]}>
            Date of Birth
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? "#2a2a2a" : "#fff",
                borderColor: isDark ? "#555" : "#ccc",
                color: isDark ? "#fff" : "#111",
              },
            ]}
            placeholder="Birthday"
            placeholderTextColor={isDark ? "#888" : "#999"}
            value={birthday}
            onChangeText={setBirthday}
          />

          <Text style={[styles.label, { color: isDark ? "#ccc" : "#333" }]}>
            Employee ID
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? "#2a2a2a" : "#fff",
                borderColor: isDark ? "#555" : "#ccc",
                color: isDark ? "#fff" : "#111",
              },
            ]}
            placeholder="Employee ID"
            placeholderTextColor={isDark ? "#888" : "#999"}
            value={employeeId}
            onChangeText={setEmployeeId}
            autoCapitalize="characters"
          />

          <TouchableOpacity onPress={updateUser} style={styles.button}>
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default EditProfile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
  },
  card: {
    width: "100%",
    height: "90%",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingTop: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    justifyContent: "flex-start",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: -50,
    zIndex: 10,
  },
  changePhoto: {
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 20,
    marginTop: -20,
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
    marginTop: 12,
    elevation: 4,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
});
