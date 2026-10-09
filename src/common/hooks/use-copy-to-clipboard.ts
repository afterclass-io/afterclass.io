"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const COPIED_RESET_MS = 2000;
const DEFAULT_SUCCESS_MESSAGE = "Copied to clipboard";
const DEFAULT_ERROR_MESSAGE = "Failed to copy";

export type CopyOptions = {
  /** Toast text on success. `null` shows no toast. */
  successMessage?: string | null;
  /** Toast text on failure. `null` shows no toast. */
  errorMessage?: string | null;
  /** Sonner toast id. A repeat copy replaces the earlier toast. */
  toastId?: string;
};

/**
 * Copies text to the clipboard and reports the result with a toast.
 * `copied` stays true for 2 s after a successful copy, for icon swaps.
 * `copy` resolves `false` when the browser refuses (`NotAllowedError`)
 * or has no clipboard API (non-secure context).
 */
export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const copy = useCallback(
    async (
      text: string,
      {
        successMessage = DEFAULT_SUCCESS_MESSAGE,
        errorMessage = DEFAULT_ERROR_MESSAGE,
        toastId,
      }: CopyOptions = {},
    ): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        if (errorMessage !== null) toast.error(errorMessage, { id: toastId });
        return false;
      }
      if (successMessage !== null) {
        toast.success(successMessage, { id: toastId });
      }
      if (mountedRef.current) {
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
      }
      return true;
    },
    [],
  );

  return { copy, copied };
}
