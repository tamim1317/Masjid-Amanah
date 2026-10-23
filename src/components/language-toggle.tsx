"use client";

import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  locale: Locale;
  onChange: (locale: Locale) => void;
  className?: string;
}

export function LanguageToggle({
  locale,
  onChange,
  className,
}: LanguageToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-stone-200 bg-white p-0.5 text-xs font-medium",
        className
      )}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => onChange("bn")}
        className={cn(
          "rounded-md px-2.5 py-1 transition-colors",
          locale === "bn"
            ? "bg-emerald-700 text-white"
            : "text-stone-600 hover:text-stone-900"
        )}
        aria-pressed={locale === "bn"}
      >
        বাংলা
      </button>
      <button
        type="button"
        onClick={() => onChange("en")}
        className={cn(
          "rounded-md px-2.5 py-1 transition-colors",
          locale === "en"
            ? "bg-emerald-700 text-white"
            : "text-stone-600 hover:text-stone-900"
        )}
        aria-pressed={locale === "en"}
      >
        EN
      </button>
    </div>
  );
}
