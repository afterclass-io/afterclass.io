import type { ToolResult } from "@/server/mcp/types";
import type { ZodType } from "zod";

export function textResult(text: string): { content: Array<{ type: "text"; text: string }>; isError?: boolean } {
  return { content: [{ type: "text" as const, text }] as Array<{ type: "text"; text: string }> };
}

export function errorResult(text: string): { content: Array<{ type: "text"; text: string }>; isError: true } {
  return { isError: true as const, content: [{ type: "text" as const, text }] as Array<{ type: "text"; text: string }> };
}

export type UnwrapOk = { ok: true; data: unknown; text: string; widgetProps?: Record<string, unknown> };
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
  const widgetProps = result.widgetProps as Record<string, unknown> | undefined;
  let data: unknown = widgetProps ?? (tool?.toWidgetProps ? (tool.toWidgetProps(result) as unknown) : undefined);
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

export function guardedParse(schema: ZodType, data: unknown): { ok: true } | { ok: false; error: string } {
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
  return !!data && typeof data === "object" && "raw" in (data as Record<string, unknown>);
}
