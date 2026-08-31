"use client";
import { useEffect, useState } from "react";

export function useIntersectionObserver(options: IntersectionObserverInit, elementId: string) {
  const [isVisible, setIsVisible] = useState<boolean>(true);

  useEffect(() => {
    const intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        setIsVisible(entry.isIntersecting);
      });
    });

    const currentElement = document.getElementById(elementId);
    if (currentElement) {
      intersectionObserver.observe(currentElement);
    }

    return () => {
      if (currentElement) intersectionObserver.unobserve(currentElement);
    };
    // `options` is intentionally not observed — the effect keys off elementId only.
  }, [elementId]);

  return [isVisible];
}
