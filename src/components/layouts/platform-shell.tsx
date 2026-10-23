"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { PlatformSidebar } from "@/components/layouts/platform-sidebar";
import { DemoBanner } from "@/components/demo-banner";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";

export function PlatformShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { locale } = useLocale();

  return (
    <div className="flex min-h-full flex-col">
      <DemoBanner locale={locale} />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:flex md:h-[calc(100vh-2.25rem)] md:sticky md:top-0">
          <PlatformSidebar />
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-stone-900/40"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <div className="absolute inset-y-0 left-0 w-60 shadow-xl">
              <PlatformSidebar />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-12 items-center gap-2 border-b border-stone-200 bg-white px-3 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
            <span className="text-sm font-semibold">Platform</span>
          </div>
          <main className="flex-1 overflow-y-auto bg-stone-50 p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
