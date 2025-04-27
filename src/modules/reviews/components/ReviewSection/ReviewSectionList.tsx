import type { ComponentPropsWithoutRef } from "react";

export type ReviewSectionListProps = ComponentPropsWithoutRef<"div">;

export const ReviewSectionList = (props: ReviewSectionListProps) => {
  return <div className="grid w-fit gap-5 md:gap-12" {...props} />;
};
