import type { ComponentPropsWithoutRef } from "react";
import { reviewSectionTheme } from "./ReviewSection.theme";

export type ReviewSectionListProps = ComponentPropsWithoutRef<"div">;

export const ReviewSectionList = (props: ReviewSectionListProps) => {
  const { reviews } = reviewSectionTheme({
    size: { initial: "sm", md: "md" },
  });
  return <div className={reviews()} {...props} />;
};
