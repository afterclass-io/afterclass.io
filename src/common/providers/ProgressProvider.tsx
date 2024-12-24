"use client";
import { type ReactNode, createContext, useContext } from "react";

import { useTransitionMount } from "@/common/hooks/useTransitionMount";

const ProgressBarContext = createContext<ReturnType<
  typeof useTransitionMount
> | null>(null);

export function useProgress() {
  const progress = useContext(ProgressBarContext);

  if (progress === null) {
    throw new Error("Need to be inside provider");
  }

  return progress;
}

export default function ProgressProvider({
  children,
}: {
  children: ReactNode;
}) {
  const progress = useTransitionMount();

  return (
    <ProgressBarContext.Provider value={progress}>
      {children}
    </ProgressBarContext.Provider>
  );
}
