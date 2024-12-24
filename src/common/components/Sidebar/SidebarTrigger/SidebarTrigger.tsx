"use client";
import * as React from "react";
import PhSidebarSimple from "~icons/ph/sidebar-simple";

import { Button, type ButtonProps } from "@/common/components/Button";
import { useSidebar } from "../SidebarProvider";
import { sidebarTheme } from "../Sidebar.theme";

export const SidebarTrigger = React.forwardRef<
  React.ElementRef<typeof Button>,
  ButtonProps
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar();
  const { trigger } = sidebarTheme();

  return (
    <Button
      ref={ref}
      as="button"
      data-sidebar="trigger"
      variant="ghost"
      className={trigger({ className })}
      aria-label="Toggle Sidebar"
      iconLeft={<PhSidebarSimple />}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    />
  );
});
SidebarTrigger.displayName = "SidebarTrigger";
