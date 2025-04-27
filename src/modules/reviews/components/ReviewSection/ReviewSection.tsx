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
        "bg-card grid gap-4 rounded-3xl pt-6 md:gap-9 md:p-6 md:pt-16",
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
