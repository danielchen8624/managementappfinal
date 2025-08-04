import { Text, View } from "react-native";
import { Stack } from "expo-router";
import { UserProvider } from "./UserContext";
import {ThemeProvider} from "./ThemeContext"
export default function Index() {
  return (
    <UserProvider>
      <ThemeProvider>
        <Stack>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </UserProvider>
  );
}
  
