import { PublicHeader } from "@/components/layouts/public-header";
import { DemoBanner } from "@/components/demo-banner";

export default async function MosquePublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="flex min-h-full flex-col">
      <DemoBanner />
      <PublicHeader slug={slug} />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-stone-200 bg-white py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-stone-500 sm:px-6">
          <p>মসজিদ আমানাহ · Masjid Amanah</p>
          <p className="mt-1">Demo UI foundation — not production data</p>
        </div>
      </footer>
    </div>
  );
}
