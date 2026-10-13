"use client";
import { startTransition, useCallback } from "react";
import { useRouter } from "next/navigation";

import { useProgress } from "@/common/providers/ProgressProvider";

export const useNavigateWithProgress = () => {
  const router = useRouter();
  const progress = useProgress();

  return useCallback(
    (href: string, options?: { refresh?: boolean }) => {
      progress.start();
      startTransition(() => {
        router.push(href);
        if (options?.refresh) router.refresh();
        progress.done();
      });
    },
    [router, progress],
  );
};
