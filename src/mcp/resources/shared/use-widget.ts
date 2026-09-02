import { useWidget as useMcpWidget } from "mcp-use/react";

/**
 * Shared wrapper around `mcp-use/react`'s `useWidget`.
 * Adds `isAvailable` guard: `false` when the host cannot call tools, `true`
 * otherwise. When `isAvailable` is false, `callTool` is `undefined` so
 * `{isAvailable && <button>}` hides CTAs (fixes Storybook dead-UI trap).
 *
 * Host detection priority:
 * 1. OpenAI/ChatGPT host (Storybook preview iframe): `window.openai` exists
 *    and `window !== window.parent` (iframe). Available iff `callTool` fn.
 * 2. Dev/inspector via `mcpUseParams` (jsdom tests, `mcp-use dev`): available
 *    iff `mcp-use` gave us a real `callTool` (bridge postMessage handler).
 * 3. MCP Apps host (or unknown): delegate to mcp-use's own `isAvailable`.
 */
export function useWidget<
  TProps = unknown,
  TState = unknown,
  TOutput = unknown,
  TMetadata = unknown,
  TToolInput = unknown,
>(defaultProps?: TProps) {
  const widget = useMcpWidget<TProps, TState, TOutput, TMetadata, TToolInput>(
    defaultProps as TProps,
  ) as unknown as {
    props: TProps;
    isPending: boolean;
    theme: string;
    callTool?: (
      name: string,
      input: Record<string, unknown>,
    ) => Promise<unknown>;
    isAvailable: boolean;
  };

  const openaiGlobal = (window as unknown as { openai?: unknown }).openai;
  const hasWindow = typeof window !== "undefined";
  const isOpenAiHost =
    hasWindow &&
    typeof openaiGlobal !== "undefined" &&
    window !== window.parent;

  const hasMcpUseParams =
    hasWindow && window.location.search.includes("mcpUseParams");

  let isAvailable: boolean;
  if (isOpenAiHost) {
    const callTool = (openaiGlobal as { callTool?: unknown })?.callTool;
    isAvailable = typeof callTool === "function";
  } else if (hasMcpUseParams) {
    isAvailable = typeof widget.callTool === "function";
  } else {
    isAvailable = widget.isAvailable;
  }

  return {
    ...widget,
    isAvailable,
    callTool: isAvailable ? widget.callTool : undefined,
  } as typeof widget & { isAvailable: boolean };
}
