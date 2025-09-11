import { Stack } from "expo-router";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebaseConfig";
import { router } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { UserProvider } from "./UserContext";
import { ThemeProvider } from "./ThemeContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ServerTimeProvider } from "./serverTimeContext";
import { BuildingProvider } from "./BuildingContext";

export default function RootLayout() {
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("../selectLogin");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const ud = snap.data() || {};

        // ✅ Legacy bypass logic
        const allowed =
          user.emailVerified === true ||
          ud.onboardingComplete === true ||
          ud.legacyBypass === true;

        if (allowed) {
          router.replace("../home");
        } else {
          router.replace("../(auth)/signUp");
        }
      } catch (err) {
        console.error("Error loading user doc:", err);
        router.replace("../(auth)/signUp");
      }
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
