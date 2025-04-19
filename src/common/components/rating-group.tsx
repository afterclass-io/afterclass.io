"use client";

import { type ComponentPropsWithoutRef, forwardRef, useState } from "react";
import type { FieldValues, ControllerRenderProps } from "react-hook-form";

import { cn } from "@/common/functions";
import { HeartIcon, HeartUnfilledIcon } from "@/common/components/icons";

const DEFAULT_MAX_RATING = 5;

type OptionalControllerProps = {
  [K in keyof ControllerRenderProps<
    FieldValues,
    string
  >]?: ControllerRenderProps<FieldValues, string>[K];
};

export type RatingGroupProps = ComponentPropsWithoutRef<"input"> &
  OptionalControllerProps & {
    maxRating?: number;
  };

export const RatingGroup = forwardRef<HTMLInputElement, RatingGroupProps>(
  ({ maxRating = DEFAULT_MAX_RATING, ...props }, ref) => {
    const [rating, setRating] = useState(0);
    const [active, setActive] = useState(0);

    const handleRatingChange = (value: number) => {
      setRating(value);
      props.onChange?.(value);
    };

    return (
      <div className="flex items-start self-stretch">
        {/* eslint-disable @typescript-eslint/no-unsafe-assignment */}
        {[...Array(maxRating)].map((_, i) => {
          const value = i + 1;
          return (
            <label
              key={i}
              className="group px-1"
              onClick={() => handleRatingChange(value)}
              onMouseEnter={() => setActive(value)}
              onMouseLeave={() => setActive(rating)}
            >
              <input
                className="hidden"
                type="radio"
                name="rating"
                value={value}
                ref={ref}
                {...props}
              />
              <HeartUnfilledIcon
                className={cn(
                  "text-border-default h-8 w-8 cursor-pointer duration-300 ease-in-out",
                  active > i && "hidden",
                )}
              />
              <HeartIcon
                className={cn(
                  "text-border-default h-8 w-8 cursor-pointer duration-300 ease-in-out",
                  active <= i && "hidden",
                )}
              />
            </label>
          );
        })}
      </div>
    );
  },
);
RatingGroup.displayName = "RatingGroup";
