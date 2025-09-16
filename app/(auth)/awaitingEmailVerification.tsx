import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { auth, db } from "../../firebaseConfig";
import { sendEmailVerification, signOut } from "firebase/auth";
import { doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

const STORAGE_EMAIL_KEY = "signup.email";

export default function AwaitingEmailVerification() {
  const [email, setEmail] = useState<string | null>(null);
  const [working, setWorking] = useState<null | "resend" | "check">(null);

  // Show which inbox to check
  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_EMAIL_KEY);
      if (stored) setEmail(stored);
    })();
  }, []);

  // Poll for verification every 3s
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      const user = auth.currentUser;
      if (!user) return;

      await user.reload();
      if (user.emailVerified) {
        try {
          await updateDoc(doc(db, "users", user.uid), {
            emailVerified: true,
            verifiedAt: serverTimestamp(),
            signup_complete: false,
            signup_stage: "awaiting_profile_info",
          });
        } catch {
          await setDoc(
            doc(db, "users", user.uid),
            {
              userID: user.uid,
              email: user.email,
              emailVerified: true,
              verifiedAt: serverTimestamp(),
              signup_complete: false,
              signup_stage: "awaiting_profile_info",
            },
            { merge: true }
          );
        } finally {
          if (pollRef.current) clearInterval(pollRef.current);
        }

        router.replace("/(auth)/signUpInfo");
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleResend = async () => {
    if (working) return;
    setWorking("resend");
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Not signed in", "Please go back and sign up again.");
        return;
      }
      await sendEmailVerification(user);
      Alert.alert(
        "Verification sent",
        "We’ve resent the email. Check inbox and spam."
      );
    } catch (e: any) {
      Alert.alert("Couldn’t resend", e?.message || "Try again.");
    } finally {
      setWorking(null);
    }
  };

  const handleIveVerified = async () => {
    if (working) return;
    setWorking("check");
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Not signed in", "Please go back and sign up again.");
        return;
      }
      await user.reload();
      if (user.emailVerified) {
        try {
          await updateDoc(doc(db, "users", user.uid), {
            emailVerified: true,
            verifiedAt: serverTimestamp(),
            signup_complete: false,
            signup_stage: "awaiting_profile_info",
          });
        } catch {
          await setDoc(
            doc(db, "users", user.uid),
            {
              userID: user.uid,
              email: user.email,
              emailVerified: true,
              verifiedAt: serverTimestamp(),
              signup_complete: false,
              signup_stage: "awaiting_profile_info",
            },
            { merge: true }
          );
        }
        router.replace("/(auth)/signUpInfo");
      } else {
        Alert.alert(
          "Still waiting",
          "We haven’t detected verification yet. Check your inbox and spam."
        );
      }
    } catch (e: any) {
      Alert.alert("Check failed", e?.message || "Try again.");
    } finally {
      setWorking(null);
    }
  };

  const handleExit = async () => {
    try {
      if (pollRef.current) clearInterval(pollRef.current); // stop polling
      await signOut(auth);
      router.replace("/(auth)/selectLogin");
    } catch (e: any) {
      Alert.alert("Couldn’t exit", e?.message || "Try again.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Exit button (top-left) */}
      <TouchableOpacity style={styles.exitBtn} onPress={handleExit}>
        <Ionicons name="close-outline" size={28} color="#fff" />
      </TouchableOpacity>

      <Ionicons
        name="mail-unread-outline"
        size={48}
        color="#C7D2FE"
        style={{ marginBottom: 12 }}
      />
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.subtitle}>
        We’ve sent a verification link to{email ? " " : ""}
        {email ? <Text style={styles.email}>{email}</Text> : " your inbox"}.
      </Text>
      <Text style={styles.subtitle}>
        Please check your inbox and <Text style={styles.bold}>spam/junk</Text>{" "}
        folder.
      </Text>
      <Text style={[styles.subtitle, { marginTop: 6 }]}>
        Once you verify, this screen will automatically continue.
      </Text>

      <View style={{ height: 20 }} />

      <TouchableOpacity
        style={styles.successBtn}
        onPress={handleIveVerified}
        disabled={working === "check"}
        activeOpacity={0.9}
      >
        {working === "check" ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
            <Text style={styles.successBtnText}>I’ve verified</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={{ height: 8 }} />

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={handleResend}
        disabled={working === "resend"}
        activeOpacity={0.9}
      >
        {working === "resend" ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="refresh-outline" size={18} color="#fff" />
            <Text style={styles.secondaryBtnText}>Resend email</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={{ height: 16 }} />

      <TouchableOpacity
        onPress={() => router.replace("/(auth)/signUp")}
        style={styles.linkBtn}
        activeOpacity={0.8}
      >
        <Text style={styles.linkText}>Wrong email? Go back to sign up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 80,
    backgroundColor: "#0B1220",
    alignItems: "center",
  },
  exitBtn: {
    position: "absolute",
    top: 50,
    left: 20,
    padding: 6,
    zIndex: 10,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: { color: "#94A3B8", textAlign: "center" },
  email: { color: "#E5E7EB", fontWeight: "800" },
  bold: { fontWeight: "800", color: "#E5E7EB" },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#475569",
    alignSelf: "stretch",
  },
  secondaryBtnText: { color: "#fff", fontWeight: "800" },
  successBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#10B981",
    alignSelf: "stretch",
  },
  successBtnText: { color: "#fff", fontWeight: "800" },
  linkBtn: { paddingVertical: 8, paddingHorizontal: 8 },
  linkText: { color: "#93C5FD", fontWeight: "700" },
});
