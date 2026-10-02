"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { DependencyList } from "react";

export function useChatScroll({
  dependencies,
  threshold = 80,
}: {
  dependencies: DependencyList;
  threshold?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const pinnedRef = useRef(true);
  const depsRef = useRef(dependencies);
  const firstRef = useRef(true);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return true;
    const distanceToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceToBottom <= threshold;
  }, [threshold]);

  const handleScroll = useCallback(() => {
    const atBottom = measure();
    pinnedRef.current = atBottom;
    setIsAtBottom(atBottom);
  }, [measure]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const container = containerRef.current;
    pinnedRef.current = true;
    setIsAtBottom(true);
    if (!container) return;
    if (typeof container.scrollTo === "function") {
      container.scrollTo({ top: container.scrollHeight, behavior });
    } else {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  useLayoutEffect(() => {
    const prev = depsRef.current;
    const changed =
      firstRef.current ||
      prev.length !== dependencies.length ||
      prev.some((d, i) => !Object.is(d, dependencies[i]));
    depsRef.current = dependencies;
    firstRef.current = false;
    const container = containerRef.current;
    if (container && changed && pinnedRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new MutationObserver(() => {
      if (pinnedRef.current) {
        container.scrollTop = container.scrollHeight;
      }
    });
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, []);

  return { containerRef, isAtBottom, scrollToBottom, handleScroll };
}
