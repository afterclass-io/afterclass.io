// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import type { DependencyList } from "react";

import { useChatScroll } from "./use-chat-scroll";

function setGeometry(
  el: HTMLElement,
  scrollHeight: number,
  clientHeight: number,
  scrollTop: number,
) {
  Object.defineProperty(el, "scrollHeight", {
    value: scrollHeight,
    configurable: true,
  });
  Object.defineProperty(el, "clientHeight", {
    value: clientHeight,
    configurable: true,
  });
  el.scrollTop = scrollTop;
  Object.defineProperty(el, "scrollTo", { value: vi.fn(), configurable: true });
}

function renderScrollHost(threshold = 80) {
  let latest: ReturnType<typeof useChatScroll> | null = null;
  function Probe({ deps }: { deps: DependencyList }) {
    latest = useChatScroll({ dependencies: deps, threshold });
    const ref = latest.containerRef;
    return createElement("div", { ref, "data-testid": "scroll-host" });
  }
  const utils = render(createElement(Probe, { deps: [] as DependencyList }));
  const result = {
    get current() {
      if (!latest) throw new Error("hook has not rendered yet");
      return latest;
    },
  };
  const host = utils.getByTestId("scroll-host") as HTMLDivElement;
  setGeometry(host, 1000, 400, 600);
  const cleanup = () => {
    utils.unmount();
  };
  return {
    result,
    host,
    rerenderDeps: (deps: DependencyList) => {
      act(() => {
        utils.rerender(createElement(Probe, { deps }));
      });
    },
    cleanup,
  };
}

describe("useChatScroll", () => {
  it("starts at the bottom and sticks to bottom when content grows", async () => {
    const { result, host, rerenderDeps, cleanup } = renderScrollHost();
    // Initially pinned: distanceToBottom = 0 <= threshold.
    expect(result.current.isAtBottom).toBe(true);

    // Streaming chunk grows the content; pinned hook follows to the new bottom.
    Object.defineProperty(host, "scrollHeight", {
      value: 1200,
      configurable: true,
    });
    rerenderDeps([1]);
    expect(host.scrollTop).toBe(host.scrollHeight);
    expect(result.current.isAtBottom).toBe(true);

    // DOM mutation while pinned scrolls to the new bottom via MutationObserver.
    Object.defineProperty(host, "scrollHeight", {
      value: 1300,
      configurable: true,
    });
    await act(async () => {
      host.appendChild(document.createElement("div"));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(host.scrollTop).toBe(1300);
    cleanup();
  });

  it("releases the pin when the user scrolls up past the threshold", async () => {
    const { result, host, cleanup } = renderScrollHost();
    expect(result.current.isAtBottom).toBe(true);

    act(() => {
      host.scrollTop = 100;
      result.current.handleScroll();
    });
    expect(result.current.isAtBottom).toBe(false);

    // While released, new content must NOT yank the scroll position.
    Object.defineProperty(host, "scrollHeight", {
      value: 1400,
      configurable: true,
    });
    await act(async () => {
      host.appendChild(document.createElement("div"));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(host.scrollTop).toBe(100);
    cleanup();
  });

  it("re-pins when the user scrolls back within the threshold", () => {
    const { result, host, cleanup } = renderScrollHost();
    act(() => {
      host.scrollTop = 100;
      result.current.handleScroll();
    });
    expect(result.current.isAtBottom).toBe(false);

    act(() => {
      host.scrollTop = 590;
      result.current.handleScroll();
    });
    expect(result.current.isAtBottom).toBe(true);
    cleanup();
  });

  it("scrollToBottom scrolls to bottom and re-pins", () => {
    const { result, host, cleanup } = renderScrollHost();
    const scrollSpy = vi.spyOn(host, "scrollTo");
    act(() => {
      host.scrollTop = 50;
      result.current.handleScroll();
    });
    expect(result.current.isAtBottom).toBe(false);

    act(() => {
      result.current.scrollToBottom("smooth");
    });
    expect(scrollSpy).toHaveBeenCalledWith({ top: 1000, behavior: "smooth" });
    expect(result.current.isAtBottom).toBe(true);
    cleanup();
  });
});
