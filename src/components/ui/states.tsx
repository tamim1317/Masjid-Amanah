import { AlertCircle, FileQuestion, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

interface StateProps {
  locale?: Locale;
  className?: string;
  title?: string;
  description?: string;
}

export function LoadingState({
  locale = "bn",
  className,
  title,
}: StateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-stone-500",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      <p className="text-sm font-medium">
        {title ?? t("common.loading", locale)}
      </p>
    </div>
  );
}

export function EmptyState({
  locale = "bn",
  className,
  title,
  description,
}: StateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-center",
        className
      )}
    >
      <div className="rounded-full bg-stone-100 p-4">
        <FileQuestion className="h-8 w-8 text-stone-400" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-stone-800">
          {title ?? t("common.empty", locale)}
        </p>
        {description && (
          <p className="text-sm text-stone-500 max-w-sm">{description}</p>
        )}
      </div>
    </div>
  );
}

export function ErrorState({
  locale = "bn",
  className,
  title,
  description,
}: StateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-center",
        className
      )}
      role="alert"
    >
      <div className="rounded-full bg-red-50 p-4">
        <AlertCircle className="h-8 w-8 text-red-500" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-stone-800">
          {title ?? t("common.error", locale)}
        </p>
        {description && (
          <p className="text-sm text-stone-500 max-w-sm">{description}</p>
        )}
      </div>
    </div>
  );
}
