"use client";

import { useEffect, useState } from "react";
import type { Size } from "./widget-geometry";

export function useViewport(): Size {
  const [viewport, setViewport] = useState<Size>(() =>
    typeof window === "undefined"
      ? { width: 1280, height: 800 }
      : { width: window.innerWidth, height: window.innerHeight },
  );
  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return viewport;
}
