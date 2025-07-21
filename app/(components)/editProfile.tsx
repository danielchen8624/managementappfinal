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
import { db, auth, storage } from "../../firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
// import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // if you want image upload

function EditProfile() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState(""); // change this to a scroll/date picker later
  const [employeeId, setEmployeeId] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const userId = auth.currentUser?.uid;

  // image picker using expo
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri); // saves local uri
    }
  };

  const updateUser = async () => {
    if (!userId) {
      console.error("User ID is not available");
      return;
    }

    // let downloadUrl;
    // If you ever enable image upload to Firebase Storage, this block handles it:
    /*
    const response = await fetch(profileImage);
    const blob = await response.blob();
    const storageRef = ref(storage, `profilePictures/${userId}`);
    await uploadBytes(storageRef, blob);
    downloadUrl = await getDownloadURL(storageRef); 
    */

    const userRef = doc(db, "users", userId);

    try {
      await setDoc(
        userRef,
        {
          firstName, // means "firstName": firstName
          lastName,
          birthday,
          employeeId,
          // ...(downloadUrl && { profileImage: downloadUrl }) // only include if image was uploaded
        },
        { merge: true }
      );
      Alert.alert("Changes Saved!");
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "please try again.");
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        {/* Avatar floating above the card */}
        {profileImage && (
          <Image source={{ uri: profileImage }} style={styles.avatar} />
        )}

        <View style={styles.card}>
          <TouchableOpacity onPress={pickImage}>
            <Text style={styles.changePhoto}>Change Profile Picture</Text>
          </TouchableOpacity>

          {/* First Name */}
          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={styles.input}
            placeholder="First Name"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="sentences"
          />

          {/* Last Name */}
          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Last Name"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="sentences"
          />

          {/* Date of Birth */}
          <Text style={styles.label}>Date of Birth</Text>
          <TextInput
            style={styles.input}
            placeholder="Birthday"
            value={birthday}
            onChangeText={setBirthday}
          />

          {/* Employee ID */}
          <Text style={styles.label}>Employee ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Employee ID"
            value={employeeId}
            onChangeText={setEmployeeId}
            autoCapitalize="characters"
          />

          {/* Save Button */}
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
    backgroundColor: "#F9FAFB",
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    height: "90%", 
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingTop: 160, // leaves room for floating avatar
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
    marginBottom: -50, // lifts into the card
    zIndex: 10,
  },
  changePhoto: {
    textAlign: "center",
    color: "#007AFF",
    fontWeight: "600",
    marginBottom: 20,
    marginTop: -20, // pulls label closer to the image
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#333",
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
    marginTop: 12,
    elevation: 4,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
});
