import type { ComponentPropsWithoutRef } from "react";
import { reviewSectionTheme } from "./ReviewSection.theme";

export type ReviewSectionProps = ComponentPropsWithoutRef<"div">;

export const ReviewSection = ({ className, ...props }: ReviewSectionProps) => {
  const { wrapper } = reviewSectionTheme({ size: { initial: "sm", md: "md" } });

  return <div className={wrapper({ className })} {...props} />;
};
