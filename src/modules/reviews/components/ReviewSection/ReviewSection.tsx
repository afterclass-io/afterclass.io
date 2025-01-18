import type { ComponentPropsWithoutRef } from "react";
import { reviewSectionTheme } from "./ReviewSection.theme";

import { ReviewSectionHeader } from "./ReviewSectionHeader";
import { ReviewSectionHeaderSortGroup } from "./ReviewSectionHeaderSortGroup";
import { ReviewSectionList } from "./ReviewSectionList";
import { ReviewSectionListFilter } from "./ReviewSectionListFilter";

export type ReviewSectionProps = ComponentPropsWithoutRef<"div">;

export const ReviewSection = ({ className, ...props }: ReviewSectionProps) => {
  const { wrapper } = reviewSectionTheme({ size: { initial: "sm", md: "md" } });

  return <div className={wrapper({ className })} {...props} />;
};

export {
  ReviewSectionHeader,
  ReviewSectionHeaderSortGroup,
  ReviewSectionList,
  ReviewSectionListFilter,
};
