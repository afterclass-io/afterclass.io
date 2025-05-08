"use client";
import { TooltipProvider as TooltipProviderPrimitive } from "@/common/components/tooltip";

export default function TooltipProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TooltipProviderPrimitive>{children}</TooltipProviderPrimitive>;
}
