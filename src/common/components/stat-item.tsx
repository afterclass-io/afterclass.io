import { LockIcon } from "@/common/components/icons";
import { Skeleton } from "@/common/components/Skeleton";

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
  layout = "horizontal",
}: StatItemProps) => {
  return (
    <div
      className="inline-flex flex-col items-start gap-2 rounded-none"
      data-test={`rating-${label.replace(/\s/g, "-").toLowerCase()}`}
    >
      <div className="text-text-em-low text-start text-sm font-medium">
        <span>{label}</span>
      </div>
      {isLocked ? (
        <LockIcon className="h-7 w-7" />
      ) : (
        <div
          className="text-text-em-high text-center text-xl font-semibold"
          data-test="stats-value"
        >
          {rating}
        </div>
      )}
    </div>
  );
};

const StatItemSkeleton = ({ layout = "horizontal", label }: StatItemProps) => {
  return (
    <div className="inline-flex flex-col items-start gap-2 rounded-none">
      <div className="text-text-em-low text-start text-sm font-medium">
        <span>{label ?? <Skeleton className="h-[20px] w-[130px]" />}</span>
      </div>
      <div className="text-text-em-high text-center text-xl font-semibold">
        {layout === "horizontal" ? (
          <Skeleton className="h-[32px] w-[54.4px]" />
        ) : (
          <Skeleton className="h-[28px] w-[130px]" />
        )}
      </div>
    </div>
  );
};
StatItem.Skeleton = StatItemSkeleton;
