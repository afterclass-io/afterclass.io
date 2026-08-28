import { useEffect } from "react";
import type { Decorator } from "@storybook/react";

export interface McpWidgetParams {
  /** Props delivered to the widget via `window.openai.toolOutput.structuredContent`. */
  props?: Record<string, unknown>;
  /** Host color-scheme preference. Default "light". */
  theme?: "light" | "dark";
  /** Full tool output override. Set to `null` to keep the widget in its pending/loading state. */
  toolOutput?: unknown;
}

/**
 * Storybook parameters the widget stories set:
 *   parameters: { mcpWidget: { props: {...}, theme: "dark" } }
 */

// `useWidget` reads `window.openai` globals through useSyncExternalStore, which
// requires getSnapshot() to return a stable reference. Story parameters objects
// are stable per story, so cache the constructed globals per-parameters object.
const globalsCache = new WeakMap<object, unknown>();

function buildGlobals(params: McpWidgetParams) {
  const toolOutput =
    params.toolOutput !== undefined
      ? params.toolOutput
      : params.props
        ? { structuredContent: params.props }
        : null;
  return {
    theme: params.theme ?? "light",
    toolInput: {},
    toolOutput,
    toolResponseMetadata: toolOutput === null ? null : {},
  };
}

function getGlobals(params: McpWidgetParams) {
  let globals = globalsCache.get(params as object);
  if (!globals) {
    globals = buildGlobals(params);
    globalsCache.set(params as object, globals);
  }
  return globals;
}

export const withMcpWidget: Decorator = (Story, context) => {
  const params = (context.parameters.mcpWidget ?? {}) as McpWidgetParams;
  const prev = (window as { openai?: unknown }).openai;
  (window as { openai?: unknown }).openai = getGlobals(params) as never;
  return (
    <RestoreOpenAiGlobals prev={prev}>
      <Story />
    </RestoreOpenAiGlobals>
  );
};

function RestoreOpenAiGlobals({
  prev,
  children,
}: {
  prev: unknown;
  children: React.ReactNode;
}) {
  useEffect(() => {
    return () => {
      if (prev === undefined) delete (window as { openai?: unknown }).openai;
      else (window as { openai?: unknown }).openai = prev;
    };
  }, [prev]);
  return <>{children}</>;
}
