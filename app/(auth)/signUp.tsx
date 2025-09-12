import React, { useMemo, useState, useEffect, useRef } from "react";
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
} from "firebase/auth";
import { auth, db } from "../../firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import {
  doc,
  setDoc,
  updateDoc,
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

  // role can come from param OR from Firestore (if RootLayout redirected without param)
  const [role, setRole] = useState<Role | null>(parseRole(params.role));

  // keep state in sync with route changes
  useEffect(() => {
    setRole(parseRole(params.role));
  }, [params.role]);

  // If role missing but user is logged in, try to hydrate from user doc
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

  const [working, setWorking] = useState<null | "send" | "resend" | "check">(
    null
  );
  const [verificationSent, setVerificationSent] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current);
    },
    []
  );

  // hydrate saved email if we have it (handy if user navigates back)
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

  const startVerificationPoll = () => {
    if (pollRef.current) clearInterval(pollRef.current);
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
          });
        } catch {
          // ensure doc exists minimally
          await setDoc(
            doc(db, "users", user.uid),
            {
              userID: user.uid,
              email: user.email,
              emailVerified: true,
              verifiedAt: serverTimestamp(),
              signup_complete: false,
              signup_stage: "awaiting_email_verification",
            },
            { merge: true }
          );
        } finally {
          if (pollRef.current) clearInterval(pollRef.current);
        }

        router.replace("/(auth)/signUpInfo");
      }
    }, 3000);
  };

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
      setVerificationSent(true);

      startVerificationPoll();

      Alert.alert(
        "Verify your email",
        "We sent a verification link to your inbox."
      );
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

  const handleResend = async () => {
    if (working) return;
    setWorking("resend");
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert(
          "Not signed in",
          "Please enter your email and password again."
        );
        setWorking(null);
        return;
      }
      await sendEmailVerification(user);
      Alert.alert("Sent", "Verification email resent. Check your inbox.");
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
        Alert.alert("Not signed in", "Please sign up again.");
        setWorking(null);
        return;
      }
      await user.reload();
      if (user.emailVerified) {
        try {
          await updateDoc(doc(db, "users", user.uid), {
            emailVerified: true,
            verifiedAt: serverTimestamp(),
            signup_complete: false,
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
              signup_stage: "awaiting_email_verification",
            },
            { merge: true }
          );
        }
        router.replace("/(auth)/signUpInfo");
      } else {
        Alert.alert(
          "Still not verified",
          "Please open the link we emailed you."
        );
      }
    } catch (e: any) {
      Alert.alert("Check failed", e?.message || "Try again.");
    } finally {
      setWorking(null);
    }
  };

  // If there's truly no role (param + Firestore both missing), show a friendly gate
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
            <Text style={styles.primaryBtnText}>
              {verificationSent ? "Send again" : "Send verification email"}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {verificationSent && (
        <View style={{ marginTop: 14 }}>
          <TouchableOpacity
            style={[styles.secondaryBtn, { marginBottom: 10 }]}
            onPress={handleResend}
            activeOpacity={0.9}
            disabled={working === "resend"}
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

          <TouchableOpacity
            style={styles.successBtn}
            onPress={handleIveVerified}
            activeOpacity={0.9}
            disabled={working === "check"}
          >
            {working === "check" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-done-outline"
                  size={18}
                  color="#fff"
                />
                <Text style={styles.successBtnText}>I’ve verified</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

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
  title: { fontSize: 22, fontWeight: "800", color: "#fff", marginBottom: 16 },
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
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#475569",
  },
  secondaryBtnText: { color: "#fff", fontWeight: "800" },
  successBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#10B981",
  },
  successBtnText: { color: "#fff", fontWeight: "800" },
  note: { marginTop: 16, color: "#94A3B8" },
});
