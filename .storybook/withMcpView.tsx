import type { Decorator } from "@storybook/react";
import { McpViewSeedContext } from "./mocks/mcp-use-react";

/**
 * Shared Storybook decorator for MCP App View stories (mcp-use v2).
 *
 * Seeds the `mcp-use/react` hooks for one story's subtree. The module itself
 * is webpack-aliased to `.storybook/mocks/mcp-use-react.ts` (see
 * `.storybook/main.ts`) because the real v2 hooks read a module-private
 * runtime context that only exists inside a mounted MCP Apps host — in
 * Storybook they would throw. The decorator wraps the story in a
 * `McpViewSeedContext.Provider`, so each story (and each sibling story in a
 * mounted Docs page) reads its own snapshot with no cross-story bleed.
 *
 * Usage:
 *   import { withMcpView, type McpViewParams } from "../../../.storybook/withMcpView";
 *   export const Default: Story = {
 *     decorators: [withMcpView({ status: "ready", toolOutput: {...} })],
 *   };
 */
export interface McpViewParams {
  status?: "pending" | "ready" | "error";
  toolInput?: Record<string, unknown>;
  toolOutput?: Record<string, unknown>;
  /** View-only result `_meta` channel (e.g. calendar-links bearer URLs). */
  meta?: Record<string, unknown>;
  error?: { message: string };
  theme?: "light" | "dark";
  /** Whether the host bridge can call tools (hides write CTAs when false). */
  isAvailable?: boolean;
}

export const withMcpView =
  (params: McpViewParams): Decorator =>
  // eslint-disable-next-line react/display-name -- Storybook decorator, not a reusable component
  (Story) => (
    <McpViewSeedContext.Provider
      value={{
        status: params.status ?? "ready",
        toolInput: params.toolInput,
        toolOutput: params.toolOutput,
        meta: params.meta,
        error: params.error,
        theme: params.theme ?? "light",
        isAvailable: params.isAvailable ?? true,
      }}
    >
      <Story />
    </McpViewSeedContext.Provider>
  );
