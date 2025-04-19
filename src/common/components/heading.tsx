import { type ComponentPropsWithoutRef } from "react";

import { cn } from "@/common/functions";

type HeadingElementType = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export type HeadingProps<Element extends HeadingElementType> =
  ComponentPropsWithoutRef<Element> & {
    as?: Element;
  };

export const Heading = ({
  children,
  as,
  className,
  ...props
}: HeadingProps<HeadingElementType>) => {
  // Component is the element that will be rendered
  const Component = as ?? "h1";

  return (
    <Component
      {...props}
      className={cn(
        className,
        "text-text-em-high font-sans font-semibold tracking-tighter",
      )}
    >
      {children}
    </Component>
  );
};
