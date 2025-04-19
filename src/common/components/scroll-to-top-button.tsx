"use client";

import { Button } from "@/common/components/button";
import { ChevronUpIcon } from "@/common/components/icons";
import { useIntersectionObserver } from "@/common/hooks/use-intersection-observer";

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
      className="fixed right-4 bottom-4"
      aria-label="scroll-top-button"
      variant="outline"
      size="icon"
      onClick={() => handleScrollToTop()}
    >
      <ChevronUpIcon />
    </Button>
  );
}
