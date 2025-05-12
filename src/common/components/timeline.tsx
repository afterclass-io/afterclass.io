"use client";
import * as React from "react";

import { cn } from "@/common/functions";

type TimelineContext = {
  orientation: "horizontal" | "vertical";
};

const TimelineContext = React.createContext<TimelineContext | null>(null);

function useTimeline() {
  const context = React.useContext(TimelineContext);
  if (!context) {
    throw new Error("useTimeline must be used within a <Timeline />.");
  }

  return context;
}

export interface TimelineProps extends React.ComponentPropsWithoutRef<"ol"> {
  orientation?: "horizontal" | "vertical";
}

export const Timeline = React.forwardRef<React.ElementRef<"ol">, TimelineProps>(
  ({ className, orientation = "vertical", ...props }, ref) => (
    <TimelineContext.Provider value={{ orientation }}>
      <ol
        ref={ref}
        role="list"
        data-orientation={orientation}
        className={cn(
          "flex",
          orientation === "vertical" && "flex-col",
          className,
        )}
        {...props}
      />
    </TimelineContext.Provider>
  ),
);
Timeline.displayName = "Timeline";

export const TimelineItem = React.forwardRef<
  React.ElementRef<"li">,
  React.ComponentPropsWithoutRef<"li">
>(({ className, ...props }, ref) => {
  const { orientation } = useTimeline();

  return (
    <li
      ref={ref}
      data-orientation={orientation}
      className={cn(
        "flex gap-4",
        orientation === "horizontal" && "flex-col",
        className,
      )}
      {...props}
    />
  );
});
TimelineItem.displayName = "TimelineItem";

export const TimelineSeparator = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => {
  const { orientation } = useTimeline();

  return (
    <div
      ref={ref}
      data-orientation={orientation}
      className={cn(
        "flex items-center",
        orientation === "vertical" && "flex-col",
        className,
      )}
      {...props}
    />
  );
});
TimelineSeparator.displayName = "TimelineSeparator";

export interface TimelineDotProps
  extends React.ComponentPropsWithoutRef<"div"> {
  variant?: "default" | "outline";
}

export const TimelineDot = React.forwardRef<
  React.ElementRef<"div">,
  TimelineDotProps
>(({ variant = "default", className, ...props }, ref) => {
  const { orientation } = useTimeline();

  return (
    <div
      ref={ref}
      data-orientation={orientation}
      className={cn(
        "flex size-4 items-center justify-center empty:after:block empty:after:rounded-full empty:after:outline-current [&_svg]:size-4",
        orientation === "vertical" && "mt-1",
        variant === "default" && "empty:after:size-2.5 empty:after:bg-current",
        variant === "outline" && "empty:after:size-2 empty:after:outline",
        className,
      )}
      {...props}
    />
  );
});
TimelineDot.displayName = "TimelineDot";

export const TimelineConnector = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => {
  const { orientation } = useTimeline();

  return (
    <div
      ref={ref}
      data-orientation={orientation}
      className={cn(
        "bg-border flex-1",
        orientation === "vertical" && "my-2 w-0.5",
        orientation === "horizontal" && "mx-2 h-0.5",
        className,
      )}
      {...props}
    />
  );
});
TimelineConnector.displayName = "TimelineConnector";

export const TimelineContent = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => {
  const { orientation } = useTimeline();

  return (
    <div
      ref={ref}
      data-orientation={orientation}
      className={cn(
        "flex-1",
        orientation === "vertical" && "pb-7 first:text-right last:text-left",
        orientation === "horizontal" && "pr-7",
        className,
      )}
      {...props}
    />
  );
});
TimelineContent.displayName = "TimelineContent";

export const TimelineTitle = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>((props, ref) => {
  const { orientation } = useTimeline();

  return <div ref={ref} data-orientation={orientation} {...props} />;
});
TimelineTitle.displayName = "TimelineTitle";

export const TimelineDescription = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => {
  const { orientation } = useTimeline();

  return (
    <div
      ref={ref}
      data-orientation={orientation}
      className={cn("text-muted-foreground text-[0.8em]", className)}
      {...props}
    />
  );
});
TimelineDescription.displayName = "TimelineDescription";
