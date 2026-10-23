import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Link, router } from "expo-router";
import { bn } from "@/i18n/bn";
import { getSupabase } from "@/lib/supabase";
import { LoadingState } from "@/components/UiState";

export default function IndexScreen() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await getSupabase().auth.getSession();
        if (!mounted) return;
        if (data.session) {
          router.replace("/home");
        }
      } catch {
        // unconfigured env — stay on landing
      } finally {
        if (mounted) setChecking(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (checking) return <LoadingState />;

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        {bn.appName}
      </Text>
      <Text style={styles.note}>{bn.financialNote}</Text>
      <Link href="/login" asChild>
        <Pressable
          style={styles.button}
          accessibilityRole="button"
          accessibilityLabel={bn.signIn}
        >
          <Text style={styles.buttonText}>{bn.signIn}</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 28, fontWeight: "700", color: "#065f46", marginBottom: 12 },
  note: { fontSize: 15, color: "#57534e", marginBottom: 24, lineHeight: 22 },
  button: {
    backgroundColor: "#047857",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    minHeight: 48,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "600" },
});
