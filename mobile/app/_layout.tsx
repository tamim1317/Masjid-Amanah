import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#ecfdf5" },
          headerTintColor: "#065f46",
          headerTitleStyle: { fontWeight: "600" },
          contentStyle: { backgroundColor: "#fafaf9" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "মসজিদ আমানাহ" }} />
        <Stack.Screen name="login" options={{ title: "প্রবেশ" }} />
        <Stack.Screen name="home" options={{ title: "ড্যাশবোর্ড" }} />
      </Stack>
    </>
  );
}
