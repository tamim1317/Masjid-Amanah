import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import type { FundStatus } from "@/lib/demo-data";

type StatusKey =
  | FundStatus
  | "posted"
  | "pending_approval"
  | "draft"
  | "approved"
  | "rejected"
  | "active"
  | "pending"
  | "suspended";

const variantMap: Record<
  StatusKey,
  "success" | "warning" | "danger" | "info" | "muted" | "secondary"
> = {
  published: "success",
  pending: "warning",
  unverified: "danger",
  posted: "success",
  pending_approval: "warning",
  draft: "muted",
  approved: "success",
  rejected: "danger",
  active: "success",
  suspended: "danger",
};

const labelKey: Partial<Record<StatusKey, string>> = {
  published: "common.published",
  pending: "common.pending",
  unverified: "common.unverified",
  posted: "status.posted",
  pending_approval: "status.pending_approval",
  draft: "status.draft",
  approved: "status.approved",
  rejected: "status.rejected",
};

interface StatusLabelProps {
  status: StatusKey;
  locale?: Locale;
  className?: string;
  label?: string;
}

export function StatusLabel({
  status,
  locale = "bn",
  className,
  label,
}: StatusLabelProps) {
  const text =
    label ??
    (labelKey[status] ? t(labelKey[status]!, locale) : status);
  return (
    <Badge variant={variantMap[status] ?? "secondary"} className={className}>
      {text}
    </Badge>
  );
}
