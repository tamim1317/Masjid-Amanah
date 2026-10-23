import { RequireAuth } from "@/lib/auth/guard-boundary";
import { AdminShell } from "@/components/layouts/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <AdminShell>{children}</AdminShell>
    </RequireAuth>
  );
}
