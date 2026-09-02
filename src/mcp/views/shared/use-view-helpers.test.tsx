// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton, TOKENS } from "./tokens";

/**
 * Shared-helpers sanity tests (mcp-use v2 migration, Task 7).
 *
 * The v1 `useWidget` isAvailable-guard tests lived here and were skipped when
 * mcp-use v2 removed `useWidget` (see Task 0). The bridge file is now deleted
 * — Views consume `useToolContext`/`useHostContext` from `mcp-use/react`
 * directly (mocked per-view in `view.test.tsx`) — so what remains to verify at
 * the shared layer is the design-token contract every View relies on.
 */
describe("views/shared tokens", () => {
  it("exports TOKENS with oklch cards for both themes", () => {
    expect(TOKENS.light.card).toMatch(/^oklch/);
    expect(TOKENS.dark.card).toMatch(/^oklch/);
    expect(TOKENS.light.primaryFg).toMatch(/^oklch/);
    expect(TOKENS.dark.primaryFg).toMatch(/^oklch/);
  });

  it("exports matching token keys for both themes (View code reads both)", () => {
    expect(Object.keys(TOKENS.light).sort()).toEqual(
      Object.keys(TOKENS.dark).sort(),
    );
  });

  it("renders the Skeleton with a Loading label and hidden live text", () => {
    render(<Skeleton dark={false} />);
    expect(screen.getByLabelText("Loading")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});
