// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: toastError },
}));

import { useCopyToClipboard } from "./use-copy-to-clipboard";

const writeText = vi.fn<(text: string) => Promise<void>>();

beforeEach(() => {
  vi.useFakeTimers();
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  toastSuccess.mockReset();
  toastError.mockReset();
  Object.assign(navigator, { clipboard: { writeText } });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useCopyToClipboard", () => {
  it("writes the text, toasts the default message and flips copied for 2000 ms", async () => {
    const { result } = renderHook(() => useCopyToClipboard());
    expect(result.current.copied).toBe(false);

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.copy("hello");
    });

    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
    expect(toastSuccess).toHaveBeenCalledWith("Copied to clipboard", {
      id: undefined,
    });
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(result.current.copied).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.copied).toBe(false);
  });

  it("uses the caller's messages and toast id", async () => {
    const { result } = renderHook(() => useCopyToClipboard());
    await act(async () => {
      await result.current.copy("x", {
        successMessage: "Link copied",
        toastId: "review-1",
      });
    });
    expect(toastSuccess).toHaveBeenCalledWith("Link copied", {
      id: "review-1",
    });
  });

  it("restarts the 2000 ms window on a repeat copy", async () => {
    const { result } = renderHook(() => useCopyToClipboard());
    await act(async () => {
      await result.current.copy("a");
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    await act(async () => {
      await result.current.copy("b");
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.copied).toBe(true);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.copied).toBe(false);
  });

  it("silences a toast when its message is null", async () => {
    const { result } = renderHook(() => useCopyToClipboard());
    await act(async () => {
      await result.current.copy("x", { successMessage: null });
    });
    expect(toastSuccess).not.toHaveBeenCalled();

    writeText.mockRejectedValueOnce(new Error("denied"));
    await act(async () => {
      await result.current.copy("x", { errorMessage: null });
    });
    expect(toastError).not.toHaveBeenCalled();
  });

  it("resolves false and shows the error toast on NotAllowedError", async () => {
    writeText.mockRejectedValueOnce(
      new DOMException("denied", "NotAllowedError"),
    );
    const { result } = renderHook(() => useCopyToClipboard());

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.copy("x", { errorMessage: "Nope" });
    });

    expect(ok).toBe(false);
    expect(toastError).toHaveBeenCalledWith("Nope", { id: undefined });
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(result.current.copied).toBe(false);
  });

  it("resolves false when the clipboard API is missing", async () => {
    Object.assign(navigator, { clipboard: undefined });
    const { result } = renderHook(() => useCopyToClipboard());

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.copy("x");
    });

    expect(ok).toBe(false);
    expect(toastError).toHaveBeenCalledWith("Failed to copy", {
      id: undefined,
    });
  });

  it("clears the timer on unmount", async () => {
    const { result, unmount } = renderHook(() => useCopyToClipboard());
    await act(async () => {
      await result.current.copy("x");
    });
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
