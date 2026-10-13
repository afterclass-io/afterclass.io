export type UserBidStatus =
  "PLANNED" | "SECURED" | "DROPPED" | "CANCELLED" | "PARTICIPATED";

export const BID_STATUS_LABELS: Record<UserBidStatus, string> = {
  PLANNED: "Planned",
  SECURED: "Secured",
  DROPPED: "Dropped",
  CANCELLED: "Cancelled",
  PARTICIPATED: "Participated",
};

export const BID_STATUS_OPTIONS: { value: UserBidStatus; label: string }[] = [
  { value: "PLANNED", label: "Planned" },
  { value: "SECURED", label: "Secured" },
  { value: "PARTICIPATED", label: "Participated" },
  { value: "DROPPED", label: "Dropped" },
  { value: "CANCELLED", label: "Cancelled" },
];

const STATUS_STYLES: Record<
  UserBidStatus,
  { chip: string; card: string; now: string }
> = {
  PLANNED: {
    chip: "bg-info/15 text-info",
    card: "bg-info/10 border-info/30 text-foreground",
    now: "ring-info",
  },
  SECURED: {
    chip: "bg-success/15 text-success",
    card: "bg-success/15 border-success/30 text-foreground",
    now: "ring-success",
  },
  PARTICIPATED: {
    chip: "bg-muted text-muted-foreground",
    card: "bg-muted border-border text-muted-foreground",
    now: "ring-foreground/40",
  },
  DROPPED: {
    chip: "bg-error/15 text-error",
    card: "bg-error/15 border-error/30 text-foreground",
    now: "ring-error",
  },
  CANCELLED: {
    chip: "bg-error/15 text-error",
    card: "bg-error/15 border-error/30 text-foreground",
    now: "ring-error",
  },
};

export function bidChipVariant(status: UserBidStatus | undefined): string {
  if (!status) return "bg-muted/15 text-muted-foreground";
  return STATUS_STYLES[status]?.chip ?? "bg-muted/15 text-muted-foreground";
}

export function slotCardVariant(
  status: UserBidStatus | undefined,
): { className: string; nowClassName: string } | null {
  if (!status) return null;
  const style = STATUS_STYLES[status];
  return style ? { className: style.card, nowClassName: style.now } : null;
}
