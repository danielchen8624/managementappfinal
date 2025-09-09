import { Stack } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../firebaseConfig";
import { router } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { UserProvider } from "./UserContext";
import { ThemeProvider } from "./ThemeContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ServerTimeProvider } from "./serverTimeContext"; // adjust path if needed
import { BuildingProvider } from "./BuildingContext";

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const routingGuard = useRef(0); // prevents rapid double navigations

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      // No user -> login chooser
      if (!u) {
        router.replace("../selectLogin");
        return;
      }

      // Ensure latest verification status
      try {
        await u.reload();
      } catch {
        // ignore reload errors (offline, etc.)
      }

      // Not verified -> keep on verify screen
      if (!u.emailVerified) {
        // e.g., your email + password signup screen that instructs verification
        router.replace("../(auth)/signUp");
        return;
      }

      // Fetch onboarding progress from Firestore
      let progressStep: string = "info";
      let onboardingComplete = false;

      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
          const data = snap.data() as any;
          progressStep = data?.progressStep ?? "done";
          onboardingComplete = data?.onboardingComplete === true || progressStep === "done";
        } else {
          // If doc doesn't exist yet, start at info
          progressStep = "info";
        }
      } catch {
        // If we can't read it, default to info step
        progressStep = "info";
      }

      // Avoid thrashing navigations
      routingGuard.current++;

      // Route based on onboarding step
      if (!onboardingComplete) {
        if (progressStep === "info") {
          router.replace("../(auth)/signUpInfo");
          return;
        }
        if (progressStep === "photo") {
          router.replace("../(auth)/signUpPhoto");
          return;
        }
        // fallthrough: unknown step -> treat as info
        router.replace("../(auth)/signUpInfo");
        return;
      }

      // Fully onboarded
      router.replace("../home");
    });

    return unsub;
  }, []);

  return (
    <BuildingProvider>
      <ServerTimeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <UserProvider>
            <ThemeProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              </Stack>
            </ThemeProvider>
          </UserProvider>
        </GestureHandlerRootView>
      </ServerTimeProvider>
    </BuildingProvider>
  );
}
