"use client";
import * as React from "react";

import { cn } from "@/common/functions";
import { HeartUnfilledIcon } from "@/common/components/icons";

const DEFAULT_MAX_RATING = 5;
const DEFAULT_ICON_SIZE = 24;
const DEFAULT_ICON_COLOR = "#C1694F";

const HeartIcon = React.memo(
  ({
    iconSize,
    index,
    isInteractive,
    onClick,
    onMouseEnter,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
    iconSize: number;
    onClick: () => void;
    onMouseEnter: () => void;
    isInteractive: boolean;
  }) => (
    <HeartUnfilledIcon
      key={index}
      size={iconSize}
      fill={style.fill}
      color={style.color}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "transition-colors duration-200",
        isInteractive && "cursor-pointer hover:scale-110",
      )}
      style={style}
    />
  ),
);
HeartIcon.displayName = "HeartIcon";

export const RatingGroup = ({
  className,
  color = DEFAULT_ICON_COLOR,
  iconSize = DEFAULT_ICON_SIZE,
  maxRating = DEFAULT_MAX_RATING,
  onChange,
  readOnly = false,
  value,
}: {
  value: number;
  onChange?: (value: number) => void;
  className?: string;
  iconSize?: number;
  maxRating?: number;
  readOnly?: boolean;
  color?: string;
}) => {
  const [hoverRating, setHoverRating] = React.useState<number | null>(null);

  const handleClick = React.useCallback(
    (index: number) => {
      if (readOnly || !onChange) return;
      const newRating = index + 1;
      onChange(newRating);
    },
    [readOnly, onChange],
  );

  const handleHover = React.useCallback(
    (index: number) => {
      if (!readOnly) {
        setHoverRating(index + 1);
      }
    },
    [readOnly],
  );

  const handleMouseLeave = React.useCallback(() => {
    if (!readOnly) {
      setHoverRating(null);
    }
  }, [readOnly]);

  const getStyle = React.useCallback(
    (index: number) => {
      const ratingToUse =
        !readOnly && hoverRating !== null ? hoverRating : value;
      return {
        color: ratingToUse > index ? color : "gray",
        fill: ratingToUse > index ? color : "transparent",
      } as React.CSSProperties;
    },
    [readOnly, hoverRating, value, color],
  );

  const ratingIcons = React.useMemo(() => {
    return Array.from({ length: maxRating }).map((_, index) => {
      const style = getStyle(index);
      return (
        <HeartIcon
          key={index}
          index={index}
          style={style}
          iconSize={iconSize}
          onClick={() => handleClick(index)}
          onMouseEnter={() => handleHover(index)}
          isInteractive={!readOnly}
        />
      );
    });
  }, [maxRating, getStyle, iconSize, handleClick, handleHover, readOnly]);

  return (
    <div
      className={cn("flex items-center gap-x-1", className)}
      onMouseLeave={handleMouseLeave}
      role="img"
      aria-label={`${value} rating`}
    >
      {ratingIcons}
      <span className="sr-only">{`${value} rating`}</span>
    </div>
  );
};
