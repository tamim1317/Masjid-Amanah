"use client";

import Link from "next/link";
import { Menu, X, Landmark } from "lucide-react";
import { useState } from "react";
import { useLocale } from "@/components/locale-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEMO_MOSQUE } from "@/lib/demo-data";

const navItems = [
  { href: (slug: string) => `/m/${slug}`, key: "nav.home" },
  { href: (slug: string) => `/m/${slug}/prayer-times`, key: "nav.prayer" },
  {
    href: (slug: string) => `/m/${slug}/announcements`,
    key: "nav.announcements",
  },
  { href: (slug: string) => `/m/${slug}/donate`, key: "nav.donate" },
  { href: (slug: string) => `/m/${slug}/reports/public`, key: "nav.finance" },
  { href: (slug: string) => `/m/${slug}/assets`, key: "nav.assets" },
  { href: (slug: string) => `/m/${slug}/contact`, key: "nav.contact" },
];

export function PublicHeader({ slug }: { slug: string }) {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const name = locale === "bn" ? DEMO_MOSQUE.nameBn : DEMO_MOSQUE.nameEn;

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href={`/m/${slug}`}
          className="flex items-center gap-2.5 font-semibold text-stone-900"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white">
            <Landmark className="h-4 w-4" aria-hidden />
          </span>
          <span className="hidden text-sm sm:inline max-w-[200px] truncate">
            {name}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href(slug)}
              className="rounded-md px-3 py-1.5 text-sm text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageToggle locale={locale} onChange={setLocale} />
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <nav
          className="border-t border-stone-100 bg-white px-4 py-3 md:hidden"
          aria-label="Mobile"
        >
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href(slug)}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-lg px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
                  )}
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
