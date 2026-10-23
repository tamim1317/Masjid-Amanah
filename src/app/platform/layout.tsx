import { RequirePlatformAdmin } from "@/lib/auth/guard-boundary";
import { PlatformShell } from "@/components/layouts/platform-shell";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequirePlatformAdmin>
      <PlatformShell>{children}</PlatformShell>
    </RequirePlatformAdmin>
  );
}
