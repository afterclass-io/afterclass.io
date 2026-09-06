import type { ToolContext, ToolResult } from "@/server/mcp/types";

import { errorResult, textResult } from "./envelopes";
import { isDevBypass } from "./env-gate";
import { buildToolContext } from "./user";
import {
  checkDestructiveConfirm,
  checkReadBudget,
  checkWriteBudget,
} from "./rate-limit";

/**
 * Single tool-call pipeline shared by every transport: auth → confirm-gate →
 * budget → run → result shaping.
 *
 * `register.ts` (MCP transport), `buildAssistantTools` (chat transport), and
 * `runViewTool` (view-bound adapters) all delegate here, so a hardening step
 * added once applies everywhere. The pipeline changes NO behavior on its own:
 * each call site passes the policy preserving its existing semantics.
 */
export interface DispatchPolicy {
  /**
   * Whether the destructive confirm-gate applies (non-readOnly write tools).
   * The gate is skipped under the local dev bypass (the single
   * `isDevBypass()` gate in ./env-gate — never active in production or
   * tests).
   */
  confirm: boolean;
  /** Which budget bucket to draw from (`"none"` skips budgeting entirely). */
  budget: "read" | "write" | "none";
  /**
   * `"text"` shapes the catalog result into a model-visible text envelope;
   * `"view"` returns `{ content, structuredContent }` with the `widgetProps`
   * channel preserved for view-bound adapters (`runViewTool` unwraps,
   * schema-validates, and summarizes downstream).
   */
  shape: "text" | "view";
  /** DB key prefix for the budget bucket (e.g. `"mcp-write"`, `"chat-write"`). */
  budgetPrefix?: string;
  /** Max chars before truncation (text shape only). Defaults to no truncation. */
  truncateAt?: number;
  /** Note appended when truncation fires (text shape only). */
  truncationNote?: string;
  /** Dev-bypass override for tests (defaults to the env-derived value). */
  devBypass?: boolean;
  /**
   * What happens when `tool.run` throws. `"capture"` (default) converts the
   * throw into `{ error: "Internal error in tool X" }` — the documented MCP /
   * view contract (handlers must never throw; matches the register "never
   * throws" test). `"propagate"` rethrows the ORIGINAL error object verbatim —
   * the chat path's historical contract, where `t.run` throws bubbled raw.
   */
  throwBehavior?: "capture" | "propagate";
}

export interface DispatchableTool {
  name: string;
  readOnly?: boolean;
  toWidgetProps?: (result: ToolResult) => unknown;
  run(ctx: ToolContext, input: never): Promise<ToolResult>;
}

export type DispatchSuccess = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  structuredContent?: unknown;
};

export type DispatchFailure = { error: string };

/** Marker for catalog isError results on the view shape (see below). */
export interface DispatchCatalogError {
  __catalogError: true;
  text: string;
}

export function isDispatchCatalogError(v: unknown): v is DispatchCatalogError {
  return (
    !!v &&
    typeof v === "object" &&
    (v as { __catalogError?: unknown }).__catalogError === true &&
    typeof (v as { text?: unknown }).text === "string"
  );
}

function isToolContext(v: unknown): v is ToolContext {
  if (!v || typeof v !== "object") return false;
  const user = (v as { user?: unknown }).user;
  return !!user && typeof user === "object" && "id" in (user as object);
}

function isDevBypassActive(devBypassOverride?: boolean): boolean {
  if (devBypassOverride !== undefined) return devBypassOverride;
  return isDevBypass();
}

/** Historical model-visible text extraction: first `type: "text"` block. */
function extractText(content: ToolResult["content"]): string | undefined {
  return content.find((c) => c.type === "text")?.text;
}

/**
 * Run one tool call through the shared pipeline. With the default
 * `throwBehavior: "capture"` it never throws: failures are returned as
 * `{ error }` (auth/confirm/budget rejections and thrown runs) or as an
 * error-shaped `{ content, isError: true }` for catalog `isError` results —
 * mirroring the historical per-transport envelopes exactly. With
 * `throwBehavior: "propagate"` the original `tool.run` throw bubbles verbatim
 * (chat path's historical contract).
 */
export async function dispatchToolCall(opts: {
  tool: DispatchableTool;
  params: unknown;
  ctx: unknown;
  policy: DispatchPolicy;
}): Promise<DispatchSuccess | DispatchFailure> {
  const { tool, params, ctx, policy } = opts;

  // The chat transport passes an already-authenticated ToolContext (no
  // request auth envelope); accept it as-is so the pipeline stays single
  // without re-resolving through the DB-backed user lookup.
  const toolCtx = isToolContext(ctx)
    ? ctx
    : await buildToolContext(ctx as never);
  if (!toolCtx)
    return {
      error:
        "Unauthorized: no verified identity and dev bypass is off. For local Inspector use `bun run mcp:dev` with MCP_DEV_BYPASS=true (see MCP.md).",
    };

  if (policy.confirm && !isDevBypassActive(policy.devBypass)) {
    const unconfirmed = checkDestructiveConfirm(tool.name, params);
    if (unconfirmed) return { error: unconfirmed };
  }

  if (policy.budget !== "none") {
    const limited =
      policy.budget === "write"
        ? await checkWriteBudget(toolCtx, policy.budgetPrefix)
        : await checkReadBudget(toolCtx, policy.budgetPrefix);
    if (limited) return { error: limited };
  }

  let result: ToolResult;
  try {
    result = await tool.run(toolCtx, params as never);
  } catch (e) {
    if (policy.throwBehavior === "propagate") throw e;
    return { error: `Internal error in tool ${tool.name}` };
  }

  if (policy.shape === "view") {
    if (result.isError) {
      const text = extractText(result.content) ?? "Tool failed";
      return {
        content: [{ type: "text" as const, text }],
        isError: true as const,
        // Pass the raw catalog content through: the view tail
        // (`finishViewTool`) must see the original isError text, not a
        // re-shaped envelope, to preserve adapter error propagation.
        structuredContent: { __catalogError: true, text },
      };
    }
    const widgetProps = result.widgetProps ?? tool.toWidgetProps?.(result);
    return {
      content: result.content,
      ...(widgetProps !== undefined ? { structuredContent: widgetProps } : {}),
    };
  }

  if (result.isError)
    return errorResult(extractText(result.content) ?? "Tool failed");
  const text = extractText(result.content) ?? "";
  if (policy.truncateAt !== undefined && text.length > policy.truncateAt)
    return textResult(
      text.slice(0, policy.truncateAt) + (policy.truncationNote ?? ""),
    );
  return textResult(text);
}
