import { cn, formatBDT } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";
import { StatusLabel } from "@/components/ui/status-label";
import type { FundStatus } from "@/lib/demo-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FinancialCardProps {
  title: string;
  amount: number;
  locale?: Locale;
  status?: FundStatus;
  subtitle?: string;
  trend?: string;
  className?: string;
}

export function FinancialCard({
  title,
  amount,
  locale = "bn",
  status,
  subtitle,
  trend,
  className,
}: FinancialCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium text-stone-600">
            {title}
          </CardTitle>
          {status && <StatusLabel status={status} locale={locale} />}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight text-stone-900 tabular-nums">
          {formatBDT(amount, locale)}
        </p>
        {(subtitle || trend) && (
          <p className="mt-1 text-xs text-stone-500">
            {subtitle}
            {trend && (
              <span className="ml-2 text-emerald-700 font-medium">{trend}</span>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
