"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Activity,
  Users,
  Landmark,
  ChevronLeft,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/platform", key: "platform.tenants", icon: Building2 },
  { href: "/platform/health", key: "platform.health", icon: Activity },
  { href: "/platform/users", key: "platform.users", icon: Users },
];

export function PlatformSidebar() {
  const pathname = usePathname();
  const { locale, setLocale, t } = useLocale();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-stone-200 bg-stone-900 text-stone-100">
      <div className="flex h-14 items-center gap-2 border-b border-stone-800 px-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <Landmark className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold">{t("brand.name")}</p>
          <p className="text-[11px] text-stone-400">Platform</p>
        </div>
      </div>

      <nav className="flex-1 p-3" aria-label="Platform">
        <ul className="space-y-0.5">
          {nav.map((item) => {
            const active =
              item.href === "/platform"
                ? pathname === "/platform"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-stone-800 font-medium text-white"
                      : "text-stone-400 hover:bg-stone-800/60 hover:text-stone-100"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-70" />
                  {t(item.key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-2 border-t border-stone-800 p-3">
        <LanguageToggle
          locale={locale}
          onChange={setLocale}
          className="w-full justify-center border-stone-700 bg-stone-800"
        />
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-stone-400 hover:text-stone-200"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {locale === "bn" ? "মূল সাইট" : "Main site"}
        </Link>
      </div>
    </aside>
  );
}
