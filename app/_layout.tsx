// app/_layout.tsx
import { Stack, useSegments, usePathname, router } from "expo-router";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      // 0) Not signed in → only bounce if not already in auth flow
      if (!user) {
        if (!inAuthFlow) router.replace("/selectLogin");
        return;
      }

      // 1) Load user doc
      let ud: any = {};
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) ud = snap.data() || {};
      } catch (err) {
        console.error("Error loading user doc:", err);
      }

      const emailVerified = user.emailVerified === true;
      const stage = ud.signup_stage as
        | "awaiting_email_verification"
        | "awaiting_profile_info"
        | "awaiting_profile_image"
        | "complete"
        | undefined;

      // 🔓 Legacy bypass: allow old accounts through even if Auth email isn't verified
      const legacyBypass =
        ud.legacyBypass === true ||
        ud.onboardingComplete === true ||     // old flag you had
        ud.progressStep === "done" ||         // old flag you had
        stage === "complete";                 // treat complete as eligible

      // 2) Not verified
      if (!emailVerified) {
        if (legacyBypass) {
          // Let them in; only force /home if they’re stuck in auth screens
          if (inAuthFlow && pathname !== "/home") router.replace("/home");
          return;
        }
        // Keep them on the verify screen
        const role = ud.role;
        const target = { pathname: "/(auth)/signUp", params: role ? { role } : {} };
        if (!inAuthFlow || pathname !== "/(auth)/signUp") router.replace(target as any);
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
        if (inAuthFlow && pathname !== "/home") router.replace("/home");
        return;
      }
    });

    return unsub;
  }, [inAuthFlow, pathname]);

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
