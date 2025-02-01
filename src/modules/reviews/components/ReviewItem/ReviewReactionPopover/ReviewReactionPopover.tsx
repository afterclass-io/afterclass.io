"use client";
import { Button } from "@/common/components/Button";
import { SmileyIcon } from "@/common/components/CustomIcon";
import { Popover } from "@/common/components/Popover";
import { useState } from "react";

export const ReviewReactionPopover = () => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  return (
    <Popover open={isHovered} onOpenChange={setIsHovered}>
      <Popover.Trigger asChild>
        <Button
          rounded
          variant="tertiary"
          size="sm"
          iconLeft={<SmileyIcon className="h-4 w-4" />}
          aria-label="React"
          data-umami-event="review-react"
          onClick={handleClick}
          onMouseOver={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        ></Button>
      </Popover.Trigger>
      <Popover.Content>test</Popover.Content>
    </Popover>
  );
};
