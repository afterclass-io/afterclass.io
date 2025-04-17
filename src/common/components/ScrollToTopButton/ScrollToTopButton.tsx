"use client";

import { Button } from "@/common/components/Button";
import { ChevronUpIcon } from "@/common/components/CustomIcon";
import { useIntersectionObserver } from "@/common/hooks/useIntersectionObserver";

const SCROLL_TO_TOP_ID = "scroll-to-top";

export function ScrollToTopButton() {
  const [isVisible] = useIntersectionObserver(
    {
      root: null,
      rootMargin: "0px",
      threshold: 0,
    } as IntersectionObserverInit,
    SCROLL_TO_TOP_ID,
  );

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (isVisible) return null;

  return (
    <Button
      className="fixed bottom-4 right-4"
      aria-label="scroll-top-button"
      variant="tertiary"
      onClick={() => handleScrollToTop()}
      iconLeft={<ChevronUpIcon />}
    />
  );
}
