"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Wallet,
  ArrowLeftRight,
  CheckSquare,
  BarChart3,
  Users,
  UsersRound,
  Package,
  Megaphone,
  Settings,
  ScrollText,
  Landmark,
  ChevronLeft,
} from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { cn } from "@/lib/utils";
import { DEMO_MOSQUE } from "@/lib/demo-data";

const mainNav = [
  { href: "/app/dashboard", key: "admin.dashboard", icon: LayoutDashboard },
  { href: "/app/accounting", key: "admin.accounting", icon: BookOpen },
  { href: "/app/accounting/funds", key: "admin.funds", icon: Wallet },
  {
    href: "/app/accounting/transfers",
    key: "admin.transfers",
    icon: ArrowLeftRight,
  },
  {
    href: "/app/accounting/approvals",
    key: "admin.approvals",
    icon: CheckSquare,
  },
  {
    href: "/app/donations",
    key: "admin.donations",
    icon: Wallet,
  },
  { href: "/app/reports", key: "admin.reports", icon: BarChart3 },
  { href: "/app/staff", key: "admin.staff", icon: Users },
  { href: "/app/committee", key: "admin.committee", icon: UsersRound },
  { href: "/app/assets", key: "admin.assets", icon: Package },
  {
    href: "/app/announcements",
    key: "admin.announcements",
    icon: Megaphone,
  },
];

const bottomNav = [
  { href: "/app/settings", key: "admin.settings", icon: Settings },
  { href: "/app/users", key: "admin.users", icon: Users },
  { href: "/app/settings/audit", key: "admin.audit", icon: ScrollText },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { locale, setLocale, t } = useLocale();
  const name = locale === "bn" ? DEMO_MOSQUE.nameBn : DEMO_MOSQUE.nameEn;

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-stone-200 bg-white">
      <div className="flex h-14 items-center gap-2 border-b border-stone-100 px-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white">
          <Landmark className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-stone-900">
            {t("brand.name")}
          </p>
          <p className="truncate text-[11px] text-stone-500">{name}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3" aria-label="Admin">
        <ul className="space-y-0.5">
          {mainNav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/app/dashboard" &&
                pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-emerald-50 font-medium text-emerald-900"
                      : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-70" />
                  {t(item.key)}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="my-4 border-t border-stone-100" />

        <ul className="space-y-0.5">
          {bottomNav.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-emerald-50 font-medium text-emerald-900"
                      : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
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

      <div className="space-y-2 border-t border-stone-100 p-3">
        <LanguageToggle locale={locale} onChange={setLocale} className="w-full justify-center" />
        <Link
          href={`/m/${DEMO_MOSQUE.slug}`}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-stone-500 hover:bg-stone-50 hover:text-stone-700"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {locale === "bn" ? "পাবলিক সাইট দেখুন" : "View public site"}
        </Link>
      </div>
    </aside>
  );
}
