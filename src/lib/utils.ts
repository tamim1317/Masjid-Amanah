import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBDT(amount: number, locale: "bn" | "en" = "bn"): string {
  const formatted = new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-BD", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return locale === "bn" ? `৳${formatted}` : `BDT ${formatted}`;
}

export function formatDate(
  date: string | Date,
  locale: "bn" | "en" = "bn"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}
