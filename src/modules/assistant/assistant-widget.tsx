"use client";

import { ArrowUpRightIcon, ChevronDownIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";
import { AfterclassIcon } from "@/common/components/icons";
import { cn } from "@/common/functions/index";
import { useViewport } from "./use-viewport";
import { useWidgetPosition } from "./use-widget-position";
import { boxPositionFromLauncher } from "./widget-geometry";

export function AssistantWidget({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const viewport = useViewport();
  const { position, size, dragHandlers, resizeHandlers } = useWidgetPosition(viewport);

  if (!position) return null;

  // The stored position is the LAUNCHER's top-left; the box opens "out of"
  // the launcher (its bottom-right corner sits at the launcher's).
  const boxPos = boxPositionFromLauncher(position, size, viewport);

  return (
    <>
      <button
        type="button"
        data-test="assistant-widget-launcher"
        aria-label={open ? "Close assistant" : "Open assistant"}
        onClick={() => onOpenChange(!open)}
        {...dragHandlers}
        className={cn(
          "fixed z-50 flex size-14 cursor-grab items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:cursor-grabbing",
          open && "hidden",
        )}
        style={{ left: position.x, top: position.y, touchAction: "none" }}
      >
        {open ? <ChevronDownIcon className="size-6" /> : <AfterclassIcon className="size-7" />}
      </button>

      <div
        role="dialog"
        aria-label="AfterClass assistant"
        className={cn(
          "fixed z-50 flex flex-col overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-2xl",
          !open && "hidden",
        )}
        style={{ left: boxPos.x, top: boxPos.y, width: size.width, height: size.height }}
      >
        {/* Drag header - Chatwoot-style: logo + title + open-full-chat + close */}
        <div
          className="flex h-12 shrink-0 cursor-grab items-center justify-between gap-2 border-b px-3 active:cursor-grabbing"
          {...dragHandlers}
        >
          <div className="flex items-center gap-2">
            <AfterclassIcon className="size-5" />
            <span className="text-sm font-semibold">AfterClass Assistant</span>
          </div>
          <div className="flex items-center gap-1">
            {/* Client-side Link: keeps the shared store alive so ChatPage can
                resume the active session on mount (a plain anchor would reload
                the page and reset the in-memory activeSessionId). */}
            <Link
              href="/assistant"
              className="text-muted-foreground hover:text-foreground flex items-center gap-0.5 rounded px-1.5 py-1 text-xs"
              data-umami-event="assistant-open-full-chat"
            >
              Open full chat <ArrowUpRightIcon className="size-3" />
            </Link>
            <button type="button" aria-label="Close assistant" onClick={() => onOpenChange(false)} className="rounded p-1 hover:bg-muted">
              <XIcon className="size-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1">{children}</div>

        <div
          aria-hidden
          {...resizeHandlers}
          className="absolute right-0 bottom-0 size-5 cursor-se-resize"
          style={{ touchAction: "none" }}
        />
      </div>
    </>
  );
}
