export type UserBidStatus =
  | "PLANNED"
  | "SECURED"
  | "MISSED"
  | "DROPPED"
  | "CANCELLED";

export const BID_STATUS_LABELS: Record<UserBidStatus, string> = {
  PLANNED: "Planned",
  SECURED: "Secured",
  MISSED: "Missed",
  DROPPED: "Dropped",
  CANCELLED: "Cancelled",
};

export const BID_STATUS_OPTIONS: { value: UserBidStatus; label: string }[] = [
  { value: "PLANNED", label: "Planned" },
  { value: "SECURED", label: "Secured" },
  { value: "DROPPED", label: "Dropped" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function bidChipVariant(status: UserBidStatus | undefined): string {
  switch (status) {
    case "PLANNED":
      return "bg-info/15 text-info";
    case "SECURED":
      return "bg-success/15 text-success";
    case "MISSED":
    case "DROPPED":
    case "CANCELLED":
      return "bg-error/15 text-error";
    default:
      return "bg-muted/15 text-muted-foreground";
  }
}
