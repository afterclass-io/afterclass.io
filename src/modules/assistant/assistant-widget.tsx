"use client";

import {
  ArrowUpRightIcon,
  ChevronDownIcon,
  Maximize2Icon,
  Minimize2Icon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";
import { AfterclassIcon } from "@/common/components/icons";
import { Button } from "@/common/components/button";
import { cn } from "@/common/functions/index";
import { useViewport } from "./use-viewport";
import { useWidgetPosition } from "./use-widget-position";
import { boxPositionFromLauncher } from "./widget-geometry";

export type WidgetGeometry = ReturnType<typeof useWidgetPosition>;

export function AssistantWidget({
  open,
  onOpenChange,
  children,
  geometry: geometryProp,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  geometry?: WidgetGeometry;
}) {
  const viewport = useViewport();
  const fallback = useWidgetPosition(viewport);
  const {
    position,
    size,
    dragHandlers,
    resizeHandlers,
    expanded,
    toggleExpanded,
  } = geometryProp ?? fallback;

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
          "bg-primary text-primary-foreground fixed z-50 flex size-14 cursor-grab items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:cursor-grabbing",
          open && "hidden",
        )}
        style={{ left: position.x, top: position.y, touchAction: "none" }}
      >
        {open ? (
          <ChevronDownIcon className="size-6" />
        ) : (
          <AfterclassIcon className="size-7" />
        )}
      </button>

      <div
        role="dialog"
        aria-label="AfterClass assistant"
        className={cn(
          "bg-popover text-popover-foreground fixed z-50 flex max-h-[calc(100dvh-1rem)] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl border shadow-2xl",
          !open && "hidden",
        )}
        style={{
          left: boxPos.x,
          top: boxPos.y,
          width: size.width,
          height: size.height,
          maxWidth: "calc(100vw - 16px)",
          maxHeight: "calc(100dvh - 16px)",
        }}
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={expanded ? "Restore widget size" : "Expand widget"}
              aria-pressed={expanded}
              onClick={toggleExpanded}
              className="size-7"
            >
              {expanded ? (
                <Minimize2Icon className="size-4" />
              ) : (
                <Maximize2Icon className="size-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close assistant"
              onClick={() => onOpenChange(false)}
              className="size-7"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1">{children}</div>

        <div
          aria-hidden
          {...resizeHandlers}
          className="absolute right-0 bottom-0 hidden size-5 cursor-se-resize sm:block"
          style={{ touchAction: "none" }}
        />
      </div>
    </>
  );
}
