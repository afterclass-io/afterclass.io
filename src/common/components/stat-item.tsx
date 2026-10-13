import { LockIcon } from "@/common/components/icons";
import { Skeleton } from "@/common/components/skeleton";
import { cn } from "@/common/functions";

export type StatItemProps = {
  label: string;
  rating: number | string;
  layout?: "horizontal" | "vertical";
  isLocked?: boolean;
};

export const StatItem = ({
  label,
  rating,
  isLocked,
  layout = "vertical",
}: StatItemProps) => {
  return (
    <div
      className={cn(
        "inline-flex flex-col items-start gap-2 rounded-none",
        layout === "horizontal" && "flex-row-reverse items-center gap-3",
      )}
      data-test={`rating-${label.replace(/\s/g, "-").toLowerCase()}`}
    >
      <div
        className={cn(
          "text-muted-foreground text-start font-medium",
          layout === "horizontal" && "text-base",
        )}
      >
        <span>{label}</span>
      </div>
      {isLocked ? (
        <LockIcon className="h-7 w-7" />
      ) : (
        <div
          className={cn(
            "text-accent-foreground text-center font-semibold",
            layout === "horizontal" ? "text-3xl" : "text-2xl",
          )}
          data-test="stats-value"
        >
          {rating}
        </div>
      )}
    </div>
  );
};

const StatItemSkeleton = ({
  layout = "vertical",
  label,
}: {
  layout?: "horizontal" | "vertical";
  label?: string;
}) => {
  return (
    <div
      className={cn(
        "inline-flex flex-col items-start gap-2 rounded-none",
        layout === "horizontal" && "flex-row-reverse items-center gap-3",
      )}
    >
      <div
        className={cn(
          "text-muted-foreground text-start font-medium",
          layout === "horizontal" && "text-base",
        )}
      >
        <span>{label ?? <Skeleton>Rating label</Skeleton>}</span>
      </div>
      <div
        className={cn(
          "text-accent-foreground text-center font-semibold",
          layout === "horizontal" ? "text-3xl" : "text-2xl",
        )}
      >
        <Skeleton>00%</Skeleton>
      </div>
    </div>
  );
};
StatItem.Skeleton = StatItemSkeleton;
