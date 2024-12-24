"use client";
import { Progress } from "@/common/components/Progress";
import { useProgress } from "@/common/providers/ProgressProvider";
import { useEffect } from "react";

export const GlobalProgressBar = () => {
  const progress = useProgress();
  useEffect(() => {
    if (progress.state === "complete") {
      setTimeout(() => {
        progress.reset();
      }, 500);
    }
  }, [progress.state]);

  if (progress.value === 0) return null;

  return (
    <Progress
      className="fixed top-0 z-[100] h-1 rounded-none"
      value={progress.value}
    />
  );
};
