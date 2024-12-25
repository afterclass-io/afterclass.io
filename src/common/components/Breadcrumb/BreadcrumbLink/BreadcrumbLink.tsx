"use client";
import * as React from "react";
import Link from "next/link";
import { Slot } from "@radix-ui/react-slot";

import { breadcrumbTheme } from "../Breadcrumb.theme";
import { useProgress } from "@/common/providers/ProgressProvider";
import { useRouter } from "next/navigation";

export const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<"a"> & {
    href: string;
    asChild?: boolean;
  }
>(({ asChild, className, ...props }, ref) => {
  const progress = useProgress();
  const router = useRouter();
  const { link } = breadcrumbTheme();
  const Comp = asChild ? Slot : Link;
  return (
    <Comp
      ref={ref}
      className={link({ className })}
      onClick={(e) => {
        if (props.target === "_blank") return;

        e.preventDefault();
        progress.start();

        React.startTransition(() => {
          router.push(props.href);
          progress.done();
        });
      }}
      {...props}
    />
  );
});
BreadcrumbLink.displayName = "BreadcrumbLink";
