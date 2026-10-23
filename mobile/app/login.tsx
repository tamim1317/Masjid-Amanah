import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { bn } from "@/i18n/bn";
import { signIn } from "@/lib/api";
import { ErrorState, LoadingState } from "@/components/UiState";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      router.replace("/home");
    } catch {
      setError(bn.errorGeneric);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingState label={bn.loading} />;
  if (error && !email) {
    return <ErrorState message={error} onRetry={() => setError(null)} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.label}>{bn.email}</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        accessibilityLabel={bn.email}
      />
      <Text style={styles.label}>{bn.password}</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        autoComplete="password"
        value={password}
        onChangeText={setPassword}
        accessibilityLabel={bn.password}
      />
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <Pressable
        style={styles.button}
        onPress={onSubmit}
        accessibilityRole="button"
        accessibilityLabel={bn.signIn}
      >
        <Text style={styles.buttonText}>{bn.signIn}</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  label: { fontSize: 14, color: "#57534e", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#d6d3d1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
    minHeight: 48,
  },
  button: {
    backgroundColor: "#047857",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    minHeight: 48,
  },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  error: { color: "#b91c1c", marginBottom: 12 },
});
