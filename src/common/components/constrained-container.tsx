import { type ComponentPropsWithoutRef } from "react";

import { cn } from "@/common/functions";

export type ConstrainedContainerProps = ComponentPropsWithoutRef<"div">;

/**
 * Re-applies the classic 954px centered content column that used to live in
 * the (school) layout. Used by routes that should stay narrow (reviews,
 * search, submit) now that the (school) layout is full-width. Bidding opted
 * back out — its content column plus CTA rail never fitted 954px.
 */
export const ConstrainedContainer = ({
  className,
  ...props
}: ConstrainedContainerProps) => {
  return (
    <div className={cn("mx-auto w-full max-w-[954px]", className)} {...props} />
  );
};
