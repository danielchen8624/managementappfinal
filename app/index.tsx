import { Text, View } from "react-native";
import { Stack } from "expo-router";
export default function Index() {
  return (
    <>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
