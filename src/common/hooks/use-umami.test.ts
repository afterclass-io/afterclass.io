// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { act, renderHook } from "@testing-library/react";
import useUmami from "./use-umami";

type UmamiWindow = Window & { umami?: { track: Mock; identify: Mock } };
const w = window as unknown as UmamiWindow;
const umamiSpy = () => ({ track: vi.fn(), identify: vi.fn() });

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  delete w.umami;
});

describe("useUmami", () => {
  it("warns and no-ops when window.umami is absent", () => {
    const { result } = renderHook(() => useUmami());

    act(() => {
      result.current.pageView();
      result.current.event("click");
      result.current.identify({ userId: 1 });
    });

    expect(console.warn).toHaveBeenCalledWith("UmamiProvider not found");
  });

  it("forwards event() to window.umami.track and echoes the payload", () => {
    w.umami = umamiSpy();
    const { result } = renderHook(() => useUmami());

    let echoed: unknown;
    act(() => {
      echoed = result.current.event("signup", { plan: "pro" });
    });

    expect(w.umami.track).toHaveBeenCalledWith("signup", { plan: "pro" });
    expect(echoed).toEqual({ name: "signup", data: { plan: "pro" } });
  });

  it("forwards pageView() as a props updater", () => {
    w.umami = umamiSpy();
    const { result } = renderHook(() => useUmami());

    act(() => result.current.pageView({ title: "Home" }));

    const updater = w.umami.track.mock.calls[0]![0] as (p: object) => object;
    expect(updater({ title: "old", url: "/" })).toEqual({
      title: "Home",
      url: "/",
    });
  });

  it("forwards identify() to window.umami.identify", () => {
    w.umami = umamiSpy();
    const { result } = renderHook(() => useUmami());

    act(() => result.current.identify({ userId: 42 }));

    expect(w.umami.identify).toHaveBeenCalledWith({ userId: 42 });
  });
});
