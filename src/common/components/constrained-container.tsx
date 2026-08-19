import { type ComponentPropsWithoutRef } from "react";

import { cn } from "@/common/functions";

export type ConstrainedContainerProps = ComponentPropsWithoutRef<"div">;

/**
 * Re-applies the classic 954px centered content column that used to live in
 * the (school) layout. Used by routes that should stay narrow (reviews,
 * bidding, search, submit) now that the (school) layout is full-width.
 */
export const ConstrainedContainer = ({
  className,
  ...props
}: ConstrainedContainerProps) => {
  return (
    <div className={cn("mx-auto w-full max-w-[954px]", className)} {...props} />
  );
};
