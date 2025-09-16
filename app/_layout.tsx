// app/_layout.tsx
import { Stack, useSegments, usePathname, router } from "expo-router";
import React, { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { UserProvider } from "./UserContext";
import { ThemeProvider } from "./ThemeContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ServerTimeProvider } from "./serverTimeContext";
import { BuildingProvider } from "./BuildingContext";

export default function RootLayout() {
  const segments = useSegments();
  const pathname = usePathname();
  const inAuthFlow = segments[0] === "(auth)";

  // ✅ Auth hydration guard
  const [authReady, setAuthReady] = useState(false);
  const [current, setCurrent] = useState<User | null>(null);

  // Subscribe ONCE (no deps)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrent(u);
      setAuthReady(true);
    });
    return unsub;
  }, []);

  // Redirect logic runs only after hydration
  useEffect(() => {
    if (!authReady) return;

    (async () => {
      // 0) Not signed in → only bounce if not already in auth flow
      if (!current) {
        if (!inAuthFlow && pathname !== "/selectLogin") {
          router.replace("/selectLogin");
        }
        return;
      }

      // 1) Load user doc (safe if it fails)
      let ud: any = {};
      try {
        const snap = await getDoc(doc(db, "users", current.uid));
        if (snap.exists()) ud = snap.data() || {};
      } catch (err) {
        console.error("Error loading user doc:", err);
      }

      const emailVerified = current.emailVerified === true;
      const stage = ud.signup_stage as
        | "awaiting_email_verification"
        | "awaiting_profile_info"
        | "awaiting_profile_image"
        | "complete"
        | undefined;

      // Legacy bypass for old accounts
      const legacyBypass =
        ud.legacyBypass === true ||
        ud.onboardingComplete === true ||
        ud.progressStep === "done" ||
        stage === "complete";

      // 2) Not verified
      if (!emailVerified) {
        if (legacyBypass) {
          // Let them in; if stuck in auth screens, push to /home
          if (inAuthFlow && pathname !== "/home") router.replace("/home");
          return;
        }

        if (stage === "awaiting_email_verification") {
          // Send them to the dedicated waiting screen
          if (pathname !== "/(auth)/awaitingEmailVerification") {
            router.replace("/(auth)/awaitingEmailVerification");
          }
          return;
        }

        // Fallback: keep them on the sign-up screen (preserve role if we have it)
        const role = ud.role;
        const target = { pathname: "/(auth)/signUp", params: role ? { role } : {} } as any;
        if (!inAuthFlow || pathname !== "/(auth)/signUp") router.replace(target);
        return;
      }

      // 3) Verified → route by stage
      if (!stage || stage === "awaiting_email_verification" || stage === "awaiting_profile_info") {
        if (pathname !== "/(auth)/signUpInfo") router.replace("/(auth)/signUpInfo");
        return;
      }

      if (stage === "awaiting_profile_image") {
        if (pathname !== "/(auth)/signUpPhoto") router.replace("/(auth)/signUpPhoto");
        return;
      }

      if (stage === "complete") {
        // Only auto-jump to /home if they are currently in the auth flow
        if (inAuthFlow && pathname !== "/home") router.replace("/home");
        // Otherwise, stay put (e.g., /deleteAccount, /profile, etc.)
        return;
      }
    })();
  }, [authReady, current, inAuthFlow, pathname]);

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
