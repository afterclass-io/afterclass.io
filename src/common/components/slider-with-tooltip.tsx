"use client";
import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/common/functions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";
import { Label } from "./label";

type SliderProps = React.ComponentPropsWithoutRef<
  typeof SliderPrimitive.Root
> & {
  showTooltip?: boolean;
  labelTitle?: string;
  labelValue?: number;
  labelFor?: string;
  marks?: { value: number; label: string }[];
  alwaysShowTooltip?: boolean;
};

const SliderTooltip = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  SliderProps
>(
  (
    {
      className,
      showTooltip = false,
      labelTitle,
      labelValue,
      labelFor,
      marks,
      alwaysShowTooltip = false,
      ...props
    },
    ref,
  ) => {
    const [value, setValue] = React.useState<number[]>(
      props.defaultValue ? [...props.defaultValue] : [0],
    );
    const [showTooltipState, setShowTooltipState] = React.useState(false);

    const handlePointerDown = () => {
      setShowTooltipState(true);
    };

    const handlePointerUp = React.useCallback(() => {
      setShowTooltipState(false);
    }, []);

    React.useEffect(() => {
      document.addEventListener("pointerup", handlePointerUp);
      return () => {
        document.removeEventListener("pointerup", handlePointerUp);
      };
    }, [handlePointerUp]);

    return (
      <div className="grid gap-6">
        {labelFor && labelTitle && (
          <Label
            htmlFor={labelFor}
            className="text-muted-foreground justify-between pl-0.5"
          >
            <span>{labelTitle}</span>
            <span>{labelValue}</span>
          </Label>
        )}

        <SliderPrimitive.Root
          ref={ref}
          className={cn(
            "relative flex w-full touch-none items-center select-none",
            className,
          )}
          onValueChange={(val) => {
            setValue(val);
            props.onValueChange?.(val);
          }}
          onPointerDown={handlePointerDown}
          min={marks ? Math.min(...marks.map((m) => m.value)) : undefined}
          max={marks ? Math.max(...marks.map((m) => m.value)) : undefined}
          {...props}
        >
          <SliderPrimitive.Track className="bg-primary/20 relative h-1 w-full grow overflow-hidden rounded-full">
            <SliderPrimitive.Range className="bg-primary absolute h-full" />
          </SliderPrimitive.Track>

          {marks && marks.length > 0 && (
            <div className="absolute inset-0 mt-3.5 flex w-full grow items-center justify-between px-[7px]">
              {marks.map((mark, index) => (
                <div
                  key={index}
                  className="relative left-0 flex flex-col items-center"
                >
                  <div className="bg-primary h-2 w-1 rounded-full" />
                  <div>{mark.label}</div>
                </div>
              ))}
            </div>
          )}

          <TooltipProvider>
            <Tooltip
              open={showTooltip && showTooltipState}
              defaultOpen={alwaysShowTooltip}
            >
              <TooltipTrigger asChild className="pointer-events-none">
                <SliderPrimitive.Thumb
                  className="border-primary/50 bg-background focus-visible:ring-ring block h-4 w-4 rounded-full border shadow transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                  onMouseEnter={() => setShowTooltipState(true)}
                  onMouseLeave={() => setShowTooltipState(alwaysShowTooltip)}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>{value[0]}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </SliderPrimitive.Root>
      </div>
    );
  },
);

SliderTooltip.displayName = "SliderTooltip";
export default SliderTooltip;
