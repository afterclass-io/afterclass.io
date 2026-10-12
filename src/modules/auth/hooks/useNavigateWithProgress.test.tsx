// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useNavigateWithProgress } from "./useNavigateWithProgress";

const mocks = vi.hoisted(() => {
  const calls: string[] = [];
  const router = {
    push: (href: string) => {
      calls.push(`push:${href}`);
    },
    refresh: () => {
      calls.push("refresh");
    },
  };
  const progress = {
    start: () => {
      calls.push("start");
    },
    done: () => {
      calls.push("done");
    },
  };
  return { calls, router, progress };
});

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
}));

vi.mock("@/common/providers/ProgressProvider", () => ({
  useProgress: () => mocks.progress,
}));

beforeEach(() => {
  mocks.calls.length = 0;
});

describe("useNavigateWithProgress", () => {
  it("starts progress, pushes the href, then completes progress", () => {
    const { result } = renderHook(() => useNavigateWithProgress());

    result.current("/account/auth/login");

    expect(mocks.calls).toEqual(["start", "push:/account/auth/login", "done"]);
  });

  it("refreshes the router between push and done when refresh is true", () => {
    const { result } = renderHook(() => useNavigateWithProgress());

    result.current("/", { refresh: true });

    expect(mocks.calls).toEqual(["start", "push:/", "refresh", "done"]);
  });

  it("does not refresh the router when refresh is false", () => {
    const { result } = renderHook(() => useNavigateWithProgress());

    result.current("/", { refresh: false });

    expect(mocks.calls).toEqual(["start", "push:/", "done"]);
  });

  it("passes the href through unchanged, including its query string", () => {
    const { result } = renderHook(() => useNavigateWithProgress());
    const href = "/account/auth/verify?email=john.doe.2023%40smu.edu.sg";

    result.current(href);

    expect(mocks.calls).toEqual(["start", `push:${href}`, "done"]);
  });

  it("keeps the same navigate function identity across re-renders", () => {
    const { result, rerender } = renderHook(() => useNavigateWithProgress());
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });
});
