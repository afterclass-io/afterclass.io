import type { ComponentPropsWithoutRef } from "react";

import { ReviewSectionHeader } from "./ReviewSectionHeader";
import { ReviewSectionHeaderSortGroup } from "./ReviewSectionHeaderSortGroup";
import { ReviewSectionList } from "./ReviewSectionList";
import { ReviewSectionListFilter } from "./ReviewSectionListFilter";
import { cn } from "@/common/functions";

export type ReviewSectionProps = ComponentPropsWithoutRef<"div">;

export const ReviewSection = ({ className, ...props }: ReviewSectionProps) => {
  return (
    <div
      className={cn(
        "bg-card grid gap-4 rounded-3xl p-3 md:gap-6 md:p-8",
        className,
      )}
      {...props}
    />
  );
};

export {
  ReviewSectionHeader,
  ReviewSectionHeaderSortGroup,
  ReviewSectionList,
  ReviewSectionListFilter,
};
