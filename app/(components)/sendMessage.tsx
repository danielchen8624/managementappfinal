import React, { useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { router } from "expo-router";
import { useTheme } from "../ThemeContext";

function SendMessage() {
  const [messageTitle, setMessageTitle] = useState("");
  const [message, setMessage] = useState("");
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const pushMessage = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("You must be logged in to send messages.");
      return;
    }
    if (!messageTitle.trim() || !message.trim()) {
      Alert.alert("Please fill in both the title and message content.");
      return;
    }
    try {
      await addDoc(collection(db, "messages"), {
        title: messageTitle.trim(),
        content: message.trim(),
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
      });
      Alert.alert("Message Sent!");
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert("Error sending message");
    } finally {
      setMessageTitle("");
      setMessage("");
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? "#121212" : "#F9FAFB" },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backButton, { color: "#2563EB" }]}>‹</Text>
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            { color: isDark ? "#f2f2f2" : "#111827" },
          ]}
        >
          Send Message
        </Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.form}>
        <TextInput
          placeholder="Message Title"
          value={messageTitle}
          onChangeText={setMessageTitle}
          style={[
            styles.input,
            {
              backgroundColor: isDark ? "#1e1e1e" : "#fff",
              borderColor: isDark ? "#555" : "#ccc",
              color: isDark ? "#fff" : "#111",
            },
          ]}
          placeholderTextColor={isDark ? "#888" : "#999"}
        />
        <TextInput
          placeholder="Message Content"
          value={message}
          onChangeText={setMessage}
          style={[
            styles.input,
            styles.textArea,
            {
              backgroundColor: isDark ? "#1e1e1e" : "#fff",
              borderColor: isDark ? "#555" : "#ccc",
              color: isDark ? "#fff" : "#111",
            },
          ]}
          placeholderTextColor={isDark ? "#888" : "#999"}
          multiline
          numberOfLines={6}
        />
        <TouchableOpacity onPress={pushMessage} style={styles.sendButton}>
          <Text style={styles.sendButtonText}>Send Message</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default SendMessage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    fontSize: 24,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  form: {
    flex: 1,
    gap: 8,
    marginHorizontal: 10,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  sendButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
