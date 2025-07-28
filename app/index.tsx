import { Text, View } from "react-native";
import { Stack } from "expo-router";
import { UserProvider } from "./UserContext";

export default function Index() {
  return ( 
    <UserProvider>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack>  
    </UserProvider>
  );
}
