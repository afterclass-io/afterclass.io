// Storybook-only mock of `mcp-use/react`: swaps the v2 View hooks
// (useToolContext / useViewTheme / useHostContext / useDynamicTool) for
// implementations driven by story `parameters.mcpView` via the `withMcpView`
// decorator in `../withMcpView`. Mirrors the module-resolution strategy of the
// `@ai-sdk/react` mock (webpack alias in `.storybook/main.ts`); vitest does
// not use webpack, so the unit suite keeps `vi.mock("mcp-use/react", ...)`.
//
// WHY A MOCK MODULE (not a React provider over the real package): every v2
// hook reads `useViewRuntime()` from `ViewRuntimeContext`, which is
// module-private in the mcp-use dist — it is only populated by
// `bootstrapView` inside the MCP Apps host iframe (Inspector or another MCP
// host). In Storybook the context is always null and the real hooks throw
// "hooks require a browser view mounted by bootstrapView", so the real module
// cannot be seeded from the outside.
//
// WHY A CONTEXT (not module-scope state): module-scope seeds leak across
// stories in a mounted-Docs page (the last-rendered story wins for all).
// `McpViewSeedContext` is scoped to the decorator's subtree, so each story —
// and each sibling story in Docs mode — reads its own snapshot.
import { createContext, useContext } from "react";
import type { CallToolHandle, CallToolSuccess, DisplayMode, HostContextHandle } from "mcp-use/react";
import type { McpViewParams } from "../withMcpView";

/** Snapshot carried by the seed provider; every field defaulted. */
export interface McpViewSeed {
  status: "pending" | "ready" | "error";
  toolInput: Record<string, unknown> | undefined;
  toolOutput: Record<string, unknown> | undefined;
  meta: Record<string, unknown> | undefined;
  error: { message: string } | undefined;
  theme: "light" | "dark";
  isAvailable: boolean;
}

const DEFAULT_SEED: McpViewSeed = {
  status: "ready",
  toolInput: undefined,
  toolOutput: undefined,
  meta: undefined,
  error: undefined,
  theme: "light",
  isAvailable: true,
};

export const McpViewSeedContext = createContext<McpViewSeed | null>(null);

function useSeed(): McpViewSeed {
  const seed = useContext(McpViewSeedContext);
  if (!seed) {
    // A View rendered without the withMcpView decorator — fail loudly with the
    // same contract the real hooks enforce (no runtime, no rendering).
    throw new Error(
      "[withMcpView] Story rendered outside the withMcpView decorator. " +
        "Add `decorators: [withMcpView({ ... })]` to the story or meta.",
    );
  }
  return seed;
}

/**
 * Simplified stand-in for the real `mcp-use/react` `ToolContextHandle`, which
 * is a RegisteredTools-keyed discriminated union (pending | ready | error)
 * whose error variant carries a `ToolError` class instance and whose
 * `toolOutput` is the bound tool's typed output. The seed snapshot cannot
 * produce `ToolError` instances, so the mock keeps this structural handle.
 * Views are NOT affected — they type against the real module (type imports
 * are not webpack-aliased), so any field a future View reads is checked by
 * tsc against the real union.
 */
export type ToolContextHandle = {
  status: "pending" | "ready" | "error";
  toolInput: Record<string, unknown> | undefined;
  toolOutput: Record<string, unknown> | undefined;
  content: unknown;
  meta: Record<string, unknown> | undefined;
  error: { message: string } | undefined;
};

export function useToolContext<Name extends string = never>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- type param kept for parity with the real hook's signature
  _name?: Name,
): ToolContextHandle {
  const seed = useSeed();
  return {
    status: seed.status,
    toolInput: seed.toolInput,
    toolOutput: seed.status === "ready" ? seed.toolOutput : undefined,
    content: undefined,
    meta: seed.status === "ready" ? seed.meta : undefined,
    error: seed.status === "error" ? seed.error : undefined,
  };
}

export function useViewTheme(): "light" | "dark" {
  return useSeed().theme;
}

export function useHostContext(): HostContextHandle {
  const seed = useSeed();
  // Full real `HostContextHandle` shape, using the hook's documented
  // fallbacks for everything the seed does not drive (the bridge is never
  // connected in Storybook — see use-host-context.d.ts in mcp-use/dist).
  return {
    theme: seed.theme,
    locale: "en-US",
    timeZone: "UTC",
    userAgent: "storybook",
    platform: "web",
    displayMode: "inline",
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    maxHeight: undefined,
    maxWidth: undefined,
    hostInfo: undefined,
    hostCapabilities: undefined,
    hostContext: undefined,
    isAvailable: seed.isAvailable,
  };
}

export function useDynamicTool<
  Args extends Record<string, unknown>,
  Result = unknown,
>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- name accepted for signature parity; stories don't round-trip tool calls
  _name: string,
): CallToolHandle<Args, Result> {
  return {
    callTool: async () =>
      ({ content: [], structuredContent: {} }) as CallToolSuccess<Result>,
    data: undefined,
    error: undefined,
    isPending: false,
  };
}

export function useDisplayMode(): {
  displayMode: DisplayMode;
  availableDisplayModes: readonly DisplayMode[];
  requestDisplayMode: (args: { mode: DisplayMode }) => Promise<void>;
} {
  return {
    displayMode: "inline",
    availableDisplayModes: ["inline"],
    requestDisplayMode: async () => {},
  };
}

// Real signature is `useViewState<T extends Record<string, unknown>>(
// defaultState: T | (() => T)): readonly [T, SetStateAction<T>]`. Stories
// never persist view state, so the mock keeps the parameter for signature
// parity but returns a null-backed tuple (divergence from the real non-null
// `T` return — nothing type-checks against it).
export function useViewState<State extends Record<string, unknown> = Record<string, unknown>>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- defaultState accepted for signature parity with the real hook
  _defaultState?: State | (() => State),
): readonly [State | null, (updater: (prev: State | null) => State | null) => void] {
  return [null, () => undefined];
}

export function useOpenExternal(): (url: string) => void {
  return () => undefined;
}

export function useSendFollowUp(): (message: string) => void {
  return () => undefined;
}

// Re-export the View-authoring surface that stays legal in stories (types
// only — the runtime members above are the seeded implementations). Types
// resolve to the real package: the webpack alias is runtime-only, and tsc
// erases type-only imports before webpack sees them.
export type { McpViewParams };
export type { ViewConfig } from "mcp-use/react";
