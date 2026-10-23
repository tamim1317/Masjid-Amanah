import { ActivityIndicator, Text, View, StyleSheet } from "react-native";

export function LoadingState({ label = "লোড হচ্ছে…" }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color="#047857" />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.center} accessibilityRole="alert">
      <Text style={styles.error}>{message}</Text>
      {onRetry ? (
        <Text style={styles.link} onPress={onRetry} accessibilityRole="button">
          আবার চেষ্টা
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fafaf9",
  },
  muted: { marginTop: 12, color: "#78716c", fontSize: 16 },
  error: { color: "#b91c1c", fontSize: 16, textAlign: "center" },
  link: { marginTop: 16, color: "#047857", fontSize: 16, fontWeight: "600" },
});
