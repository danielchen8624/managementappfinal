import { Stack } from "expo-router";
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { router } from "expo-router";
import { User } from "firebase/auth";
import { UserProvider } from "./UserContext";

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      console.log("user: ", user);
      setUser(user);

      if (user) {
        router.replace("../home");
      } else {
        router.replace("../selectLogin");
      }
    });
    return unsub;
  }, []);

  return (
    <UserProvider>
    <Stack screenOptions={{headerShown: false}}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />;
    </Stack>
    </UserProvider>
  );
}
