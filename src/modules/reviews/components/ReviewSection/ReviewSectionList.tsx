import type { ComponentPropsWithoutRef } from "react";

export type ReviewSectionListProps = ComponentPropsWithoutRef<"div">;

export const ReviewSectionList = (props: ReviewSectionListProps) => {
  return <div className="grid w-fit gap-3 md:gap-5" {...props} />;
};
