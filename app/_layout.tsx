import { Stack } from "expo-router";
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { router } from "expo-router";
import { User } from "firebase/auth";
import { UserProvider } from "./UserContext";
import {ThemeProvider} from "./ThemeContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";

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
    <GestureHandlerRootView style = {{flex: 1}}>
    <UserProvider>
      <ThemeProvider>
    <Stack screenOptions={{headerShown: false}}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />;
    </Stack>
    </ThemeProvider>
    </UserProvider>
    </GestureHandlerRootView>
    
  );
}
