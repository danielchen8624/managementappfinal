import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  fetchSignInMethodsForEmail,
  signOut,
} from "firebase/auth";
import { auth, db } from "../../firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import {
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";

const STORAGE_EMAIL_KEY = "signup.email";

type Role = "supervisor" | "manager" | "security" | "employee";
const ROLES: Role[] = ["supervisor", "manager", "security", "employee"];
function parseRole(raw: unknown): Role | null {
  if (typeof raw !== "string") return null;
  const lower = raw.toLowerCase();
  return (ROLES as string[]).includes(lower) ? (lower as Role) : null;
}

export default function SignUp() {
  const params = useLocalSearchParams<{ role?: string }>();
  const [role, setRole] = useState<Role | null>(parseRole(params.role));

  useEffect(() => {
    setRole(parseRole(params.role));
  }, [params.role]);

  useEffect(() => {
    (async () => {
      if (!role && auth.currentUser?.uid) {
        try {
          const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
          const found = parseRole(snap.data()?.role);
          if (found) setRole(found);
        } catch {}
      }
    })();
  }, [role]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [working, setWorking] = useState<null | "send">(null);

  // hydrate saved email (useful if user navigates back)
  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_EMAIL_KEY);
      if (stored) setEmail(stored);
    })();
  }, []);

  const trimmedEmail = useMemo(() => email.trim(), [email]);
  const trimmedPass = useMemo(() => password.trim(), [password]);
  const canSubmit =
    !!role && trimmedEmail.length > 3 && trimmedPass.length >= 6 && !working;

  const handleSendVerification = async () => {
    if (!canSubmit || !role) return;
    setWorking("send");
    try {
      const methods = await fetchSignInMethodsForEmail(auth, trimmedEmail);
      if (methods.length && !methods.includes("password")) {
        Alert.alert(
          "Email already in use",
          `This email is registered with: ${methods.join(
            ", "
          )}. Sign in with that method and set a password from Profile.`
        );
        setWorking(null);
        return;
      }

      const { user } = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        trimmedPass
      );

      await setDoc(
        doc(db, "users", user.uid),
        {
          userID: user.uid,
          email: trimmedEmail,
          role,
          createdAt: serverTimestamp(),
          emailVerified: false,
          signup_complete: false,
          signup_stage: "awaiting_email_verification",
        },
        { merge: true }
      );

      await sendEmailVerification(user);
      await AsyncStorage.setItem(STORAGE_EMAIL_KEY, trimmedEmail);

      // Hand off to the awaiting screen; it will poll and redirect when verified
      router.replace("/(auth)/awaitingEmailVerification");
    } catch (e: any) {
      let msg = e?.message || "Something went wrong.";
      if (e?.code === "auth/email-already-in-use") {
        msg =
          "This email already has a password account. Try logging in instead.";
      }
      Alert.alert("Couldn’t start sign up", msg);
    } finally {
      setWorking(null);
    }
  };

  const handleExit = async () => {
    try {
      await signOut(auth); // unauth the user
      router.replace("/(auth)/selectLogin");
    } catch (e: any) {
      Alert.alert("Couldn’t exit", e?.message || "Try again.");
    }
  };

  if (!role) {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { marginBottom: 8 }]}>Select a role</Text>
        <Text style={{ color: "#94A3B8" }}>
          We couldn’t determine your role. Please pick one to continue.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/selectLogin")}
          style={[styles.primaryBtn, { marginTop: 20 }]}
        >
          <Text style={styles.primaryBtnText}>Go to role picker</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={handleExit}>
        <Ionicons name="close-outline" size={28} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.title}>Create your account</Text>

      <Text style={styles.label}>Email</Text>
      <View style={styles.inputWrap}>
        <Ionicons name="mail-outline" size={18} color="#94A3B8" />
        <TextInput
          placeholder="you@example.com"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
      </View>

      <Text style={styles.label}>Password</Text>
      <View style={styles.inputWrap}>
        <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" />
        <TextInput
          placeholder="Minimum 6 characters"
          placeholderTextColor="#9CA3AF"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPw}
          style={styles.input}
        />
        <TouchableOpacity onPress={() => setShowPw((v) => !v)}>
          <Ionicons
            name={showPw ? "eye-off-outline" : "eye-outline"}
            size={18}
            color="#B6C2CF"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, { opacity: canSubmit ? 1 : 0.9 }]}
        disabled={!canSubmit}
        onPress={handleSendVerification}
        activeOpacity={0.9}
      >
        {working === "send" ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="paper-plane-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Send verification email</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.note}>
        We’ll ask for your details and a profile photo after you verify your
        email.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    backgroundColor: "#0B1220",
  },
  backBtn: {
    position: "absolute",
    top: 50,
    left: 20,
    padding: 6,
    zIndex: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 16,
    marginTop: 20,
    textAlign: "center",
  },
  label: {
    color: "#C7D2FE",
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: "#111827",
    borderColor: "#1F2937",
  },
  input: { flex: 1, fontSize: 16, color: "#E5E7EB", padding: 0 },
  primaryBtn: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  note: { marginTop: 16, color: "#94A3B8" },
});
