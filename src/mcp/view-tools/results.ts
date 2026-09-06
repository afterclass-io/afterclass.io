import type { ToolResult } from "@/server/mcp/types";
import type { ZodType } from "zod";
import { dispatchToolCall, isDispatchCatalogError } from "../dispatch";

export function textResult(text: string): {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
} {
  return {
    content: [{ type: "text" as const, text }] as Array<{
      type: "text";
      text: string;
    }>,
  };
}

export function errorResult(text: string): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  return {
    isError: true as const,
    content: [{ type: "text" as const, text }] as Array<{
      type: "text";
      text: string;
    }>,
  };
}

export type UnwrapOk = {
  ok: true;
  data: unknown;
  text: string;
  widgetProps?: Record<string, unknown>;
};
export type UnwrapErr = { ok: false; error: string; text: string };

/**
 * Unwrap catalog run result into a data payload.
 * Order: result.widgetProps -> tool.toWidgetProps(result) -> JSON.parse(text) (guarded).
 * Returns ok:false with error string if JSON parsing fails.
 * `fallbackJson` controls what to parse when content text is missing (undefined/null):
 *   - "{}" for object-shaped tools (roadmap, reviews, bid-plan, explore)
 *   - "" for array-shaped / recommend tools where missing should be Invalid JSON
 */
export function unwrapResultData(
  result: ToolResult,
  tool?: { toWidgetProps?: (result: ToolResult) => unknown },
  fallbackJson = "{}",
): UnwrapOk | UnwrapErr {
  const text = result.content[0]?.text ?? "";
  const widgetProps = result.widgetProps;
  let data: unknown =
    widgetProps ??
    (tool?.toWidgetProps ? tool.toWidgetProps(result) : undefined);
  if (data !== undefined) {
    return { ok: true, data, text, widgetProps };
  }
  const rawText = result.content[0]?.text;
  const jsonSource = rawText ?? fallbackJson;
  try {
    data = JSON.parse(jsonSource);
    return { ok: true, data, text, widgetProps };
  } catch (e) {
    return { ok: false, error: String(e), text };
  }
}

export function guardedParse(
  schema: ZodType,
  data: unknown,
): { ok: true } | { ok: false; error: string } {
  try {
    schema.parse(data);
    return { ok: true };
  } catch (e) {
    const msg = String(e);
    console.error("[mcp] Output schema validation failed", msg);
    return { ok: false, error: msg };
  }
}

export function isRawPayload(data: unknown): boolean {
  return (
    !!data &&
    typeof data === "object" &&
    "raw" in (data as Record<string, unknown>)
  );
}

/** What an object-shaped view-tool adapter returns to mcp-use. */
export type ViewToolOutcome =
  | {
      content: Array<{ type: "text"; text: string }>;
      structuredContent: unknown;
    }
  | { content: Array<{ type: "text"; text: string }>; isError: true };

export interface RunViewToolOptions {
  ctx: unknown;
  params: unknown;
  /** The catalog tool backing this adapter (its toWidgetProps participates in unwrapping). */
  tool: {
    run(ctx: unknown, input: unknown): Promise<ToolResult>;
    toWidgetProps?: (result: ToolResult) => unknown;
  };
  schema: ZodType;
  /** Default "{}" — pass "" for array-shaped/recommend tools where missing content must fail. */
  fallbackJson?: string;
  /** Error text when the unwrapped payload is a raw { raw } envelope. */
  rawPayloadMessage: string;
  /** Builds the model-visible summary from the validated structuredContent. */
  summarize: (data: unknown) => string;
}

/**
 * Shared pipeline for the object-shaped view-tool adapters: auth → tool.run →
 * unwrapResultData → raw-payload guard → schema guard → { summary text,
 * structuredContent }. Auth/budget/run delegate to `dispatchToolCall`; the
 * unwrap tail is `finishViewTool` below. Error envelopes mirror each
 * adapter's historical messages exactly ("Unauthorized: ...", "Tool failed",
 * "Invalid JSON from catalog", rawPayloadMessage, "Output schema validation
 * failed").
 */
export async function runViewTool(
  opts: RunViewToolOptions,
): Promise<ViewToolOutcome> {
  // Auth + read-budget + run via the single shared pipeline (`shape: "view"`
  // preserves the widgetProps channel for the unwrap below). Error envelopes
  // mirror each adapter's historical messages exactly ("Unauthorized: ...",
  // "Tool failed", "Invalid JSON from catalog", rawPayloadMessage, "Output
  // schema validation failed").
  const out = await dispatchToolCall({
    tool: opts.tool as never,
    params: opts.params,
    ctx: opts.ctx,
    policy: { confirm: false, budget: "read", shape: "view" },
  });
  if ("error" in out) return errorResult(out.error);
  return finishViewTool(opts, out.content, out.structuredContent);
}

export function isCatalogError(
  v: unknown,
): v is { __catalogError: true; text: string } {
  return isDispatchCatalogError(v);
}

/**
 * Unwrap → raw-payload guard → schema guard → { summary text,
 * structuredContent }. Pure over the dispatch result so bespoke adapters
 * (search-courses) can reuse the tail without changing envelopes.
 */
export function finishViewTool(
  opts: Pick<
    RunViewToolOptions,
    "tool" | "schema" | "fallbackJson" | "rawPayloadMessage" | "summarize"
  >,
  content: Array<{ type: "text"; text: string }>,
  structuredContent: unknown,
): ViewToolOutcome {
  // Catalog isError results pass through dispatch with their original text
  // intact: propagate the message verbatim (adapters' historical contract).
  if (isCatalogError(structuredContent))
    return errorResult(structuredContent.text);
  const fake: ToolResult = {
    content: content.map((c) => ({ type: "text", text: c.text })),
    ...(structuredContent !== undefined
      ? { widgetProps: structuredContent as Record<string, unknown> }
      : {}),
  };
  const unwrapped = unwrapResultData(fake, opts.tool, opts.fallbackJson);
  if (!unwrapped.ok) return errorResult("Invalid JSON from catalog");
  const structured: unknown = unwrapped.data;
  if (isRawPayload(structured)) return errorResult(opts.rawPayloadMessage);
  const parsed = guardedParse(opts.schema, structured);
  if (!parsed.ok) return errorResult("Output schema validation failed");
  return {
    content: [{ type: "text" as const, text: opts.summarize(structured) }],
    structuredContent: structured,
  };
}
