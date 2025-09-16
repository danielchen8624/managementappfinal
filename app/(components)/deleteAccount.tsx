// dont put this into auth since itll auto redirect
import React, { useCallback, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
  User,
} from "firebase/auth";
import { auth, db } from "../../firebaseConfig"; // <- make sure this points to your config
import { doc, deleteDoc, getDoc } from "firebase/firestore";

export default function DeleteAccountScreen() {
  const user: User | null = auth.currentUser;
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return confirmText.trim().toUpperCase() === "DELETE" && !isDeleting;
  }, [confirmText, isDeleting]);

  const handleDelete = useCallback(async () => {
    setError(null);

    if (!user) {
      Alert.alert("Not signed in", "Please sign in again and retry.");
      return;
    }
    if (confirmText.trim().toUpperCase() !== "DELETE") {
      Alert.alert("Confirmation required", "Type DELETE to confirm.");
      return;
    }

    setIsDeleting(true);
    try {
      // 1) Reauthenticate if using email/password
      // If the user has a password provider, reauth is required.
      const hasPasswordProvider =
        (user.providerData || []).some((p) => (p?.providerId ?? "") === "password") ||
        user.providerData.length === 0; // Anonymous/unknown—treat like needs reauth

      if (hasPasswordProvider) {
        if (!user.email) {
          throw new Error("No email associated with this account.");
        }
        if (password.length < 1) {
          throw new Error("Please enter your current password to continue.");
        }
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
      }
      // NOTE: If using OAuth (Google/Apple), Firebase still requires a "recent login".
      // In RN/Expo, you’d re-auth with the relevant provider SDK, then call
      // reauthenticateWithCredential/Provider. If we hit 'requires-recent-login', we surface it.

      const uid = user.uid;

      // 2) Best-effort Firestore cleanup (top-level user doc only)
      // If you have subcollections, handle cascade via Cloud Function.
      const userDocRef = doc(db, "users", uid);
      const exists = await getDoc(userDocRef);
      if (exists.exists()) {
        await deleteDoc(userDocRef);
      }

      // 3) Delete Auth user
      await deleteUser(user);

      // 4) Done
      Alert.alert(
        "Account deleted",
        "Your account has been permanently removed.",
        [
          {
            text: "OK",
            onPress: () => {
              // Optionally, you can navigate away. Example with expo-router:
              // router.replace("/(auth)/login");
            },
          },
        ]
      );
    } catch (e: any) {
      console.log("Delete error:", e);
      const code = e?.code || "";
      if (code === "auth/requires-recent-login") {
        setError(
          "This action requires a recent login. Please sign out and sign back in, or reauthenticate with your provider, then try again."
        );
      } else if (code === "auth/wrong-password") {
        setError("Incorrect password. Please try again.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a bit and try again.");
      } else if (e?.message) {
        setError(e.message);
      } else {
        setError("Failed to delete account. Please try again.");
      }
    } finally {
      setIsDeleting(false);
    }
  }, [user, confirmText, password]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.iconWrap}>
            <Ionicons name="warning-outline" size={48} />
          </View>

          <Text style={styles.title}>Delete Account</Text>
          <Text style={styles.subtitle}>
            This will permanently remove your account and sign you out.{"\n"}
            <Text style={{ fontWeight: "600" }}>
              This action cannot be undone.
            </Text>
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>Signed in as</Text>
            <Text style={styles.value}>{user?.email ?? "(no email)"}</Text>

            <View style={styles.separator} />

            <Text style={styles.label}>Type DELETE to confirm</Text>
            <TextInput
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder="DELETE"
              autoCapitalize="characters"
              style={styles.input}
            />

            {(user?.providerData ?? []).some((p) => p.providerId === "password") && (
              <>
                <Text style={[styles.label, { marginTop: 16 }]}>
                  Current password
                </Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  secureTextEntry
                  style={styles.input}
                />
              </>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              onPress={handleDelete}
              disabled={!canSubmit}
              style={[styles.deleteBtn, !canSubmit && styles.disabledBtn]}
            >
              {isDeleting ? (
                <ActivityIndicator />
              ) : (
                <Text style={styles.deleteText}>Delete my account</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.helper}>
              If you see “requires recent login”, sign out and sign back in, then
              try again. For Google/Apple login, reauthenticate via the same
              provider before retrying.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    padding: 20,
    flexGrow: 1,
    justifyContent: "center",
  },
  iconWrap: {
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
    opacity: 0.8,
  },
  card: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 6,
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
    marginVertical: 12,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  deleteBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  disabledBtn: { opacity: 0.5 },
  deleteText: { fontSize: 16, fontWeight: "700" },
  helper: {
    marginTop: 12,
    fontSize: 12,
    opacity: 0.7,
    textAlign: "center",
  },
  error: {
    marginTop: 12,
    color: "#b00020",
    fontSize: 13,
  },
});
