import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, FlatList, StyleSheet } from "react-native";
import { router } from "expo-router";
import { bn } from "@/i18n/bn";
import { listMyMemberships, signOut } from "@/lib/api";
import { ErrorState, LoadingState } from "@/components/UiState";

type Membership = {
  id: string;
  mosque_id: string;
  roles: string[];
  status: string;
};

export default function HomeScreen() {
  const [rows, setRows] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await listMyMemberships()) as Membership[];
      setRows(data);
    } catch {
      setError(bn.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onSignOut() {
    await signOut();
    router.replace("/login");
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <View style={styles.container}>
      <Text style={styles.heading} accessibilityRole="header">
        {bn.memberships}
      </Text>
      <Text style={styles.note}>{bn.financialNote}</Text>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.muted}>{bn.noMemberships}</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.mosque_id}</Text>
            <Text style={styles.muted}>{item.roles.join(", ")}</Text>
          </View>
        )}
      />
      <Pressable
        style={styles.outlineBtn}
        onPress={onSignOut}
        accessibilityRole="button"
        accessibilityLabel={bn.signOut}
      >
        <Text style={styles.outlineText}>{bn.signOut}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  heading: { fontSize: 22, fontWeight: "700", color: "#065f46", marginBottom: 8 },
  note: { fontSize: 14, color: "#57534e", marginBottom: 16, lineHeight: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e7e5e4",
  },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#1c1917" },
  muted: { color: "#78716c", marginTop: 4 },
  outlineBtn: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#047857",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    minHeight: 48,
  },
  outlineText: { color: "#047857", fontWeight: "600", fontSize: 16 },
});
