import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/auth/authorize";
import { AppAuthError } from "@/lib/auth/errors";
import { requirePlatformAdmin } from "@/lib/auth/authorize";

/**
 * Server Component gate for /app routes.
 */
export async function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = await getOptionalUser();
  if (!user) {
    redirect("/login?next=/app/dashboard");
  }
  return <>{children}</>;
}

/**
 * Server Component gate for /platform routes.
 */
export async function RequirePlatformAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requirePlatformAdmin();
  } catch (e) {
    if (e instanceof AppAuthError && e.code === "unauthenticated") {
      redirect("/login?next=/platform");
    }
    redirect("/app/dashboard");
  }
  return <>{children}</>;
}
