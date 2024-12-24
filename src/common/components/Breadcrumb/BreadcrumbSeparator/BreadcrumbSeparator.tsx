import * as React from "react";
import PhCaretRight from "~icons/ph/caret-right";
import { breadcrumbTheme } from "../Breadcrumb.theme";

export const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) => {
  const { separator } = breadcrumbTheme();
  return (
    <li
      role="presentation"
      aria-hidden="true"
      className={separator({ className })}
      {...props}
    >
      {children ?? <PhCaretRight />}
    </li>
  );
};
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";
