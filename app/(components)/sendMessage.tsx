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

function SendMessage() {
  const [messageTitle, setMessageTitle] = useState("");
  const [message, setMessage] = useState("");

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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Message</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.form}>
        <TextInput
          placeholder="Message Title"
          value={messageTitle}
          onChangeText={setMessageTitle}
          style={styles.input}
          placeholderTextColor="#888"
        />
        <TextInput
          placeholder="Message Content"
          value={message}
          onChangeText={setMessage}
          style={[styles.input, styles.textArea]}
          placeholderTextColor="#888"
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
    backgroundColor: "#F9FAFB",
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
    color: "#2563EB",
    fontSize: 24,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  form: {
    flex: 1,
    gap: 8,
    marginHorizontal: 10,
  },
  input: {
    width: "100%",
    backgroundColor: "#fff",
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    color: "#111",
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
    marginHorizontal: 20, // consistent spacing like the rest of your components
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

