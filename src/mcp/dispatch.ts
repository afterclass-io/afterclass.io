import type { ToolContext, ToolResult } from "@/server/mcp/types";

import { checkBudget, type BudgetKind } from "@/server/assistant/budget";
import { errorResult, textResult } from "./envelopes";
import { isDevBypass } from "./env-gate";
import { stripSecrets, truncate, wrapToolOutput } from "./output-policy";
import { appendAuditLog } from "@/server/mcp/audit-log";
import { getChatConfig, getRateLimitWindowMinutes } from "@/server/ecfg/chat";
import { buildToolContext } from "./user";
import { checkDestructiveConfirm } from "./rate-limit";

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
   * `"view"` returns `{ content, structuredContent }` with the `viewProps`
   * channel preserved for view-bound adapters (`runViewTool` unwraps,
   * schema-validates, and summarizes downstream).
   */
  shape: "text" | "view";
  /** DB key prefix for the budget bucket (e.g. `"mcp-write"`, `"chat-write"`). */
  budgetPrefix?: string;
  /**
   * Custom per-call limit for the budget bucket. Defaults to the transport
   * ceiling (`mcp-write:`/`mcp-read:` limit from `getChatConfig`) — the chat
   * transport passes its own effective write limit here (same value it
   * reports in its friendly over-budget message).
   */
  limit?: number;
  /** Custom window in ms for the budget bucket (default 1 minute). */
  windowMs?: number;
  /**
   * Friendly over-budget message formatter. Receives the charged `limit` and
   * the `retryAfterSeconds` from the bucket; defaults to the MCP
   * read/write-rate-limit wording. The chat transport passes its own
   * slow-down text so the model relays a first-person message.
   */
  onBudgetExceeded?: (args: {
    limit: number;
    retry: number;
    kind: BudgetKind;
  }) => string;
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
  toViewProps?: (result: ToolResult) => unknown;
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
    // Single-owner budget (Task 7): dispatch owns the charge via the single
    // `checkBudget` shape — `limit`/`windowMs` override the transport
    // ceiling when the policy carries them (the chat transport passes its
    // effective write limit; MCP viewless/view-bound paths omit them and
    // get the canonical `mcp-write:`/`mcp-read:` limit from
    // `getChatConfig`). Confirm runs BEFORE the charge, so rejected calls
    // are never charged. `onBudgetExceeded` lets the caller supply its own
    // friendly over-budget text (chat); otherwise the MCP wording applies.
    const chat = await getChatConfig();
    const limit = policy.limit ?? chat.mcpRateLimitPerMinute;
    const windowMs =
      policy.windowMs ?? getRateLimitWindowMinutes() * 60_000;
    const { ok, retryAfterSeconds } = await checkBudget(toolCtx, {
      prefix:
        policy.budgetPrefix ?? (policy.budget === "write" ? "mcp-write" : "mcp-read"),
      limit,
      windowMs,
      kind: policy.budget,
    });
    if (!ok) {
      if (policy.onBudgetExceeded)
        return {
          error: policy.onBudgetExceeded({
            limit,
            retry: retryAfterSeconds,
            kind: policy.budget,
          }),
        };
      return {
        error:
          policy.budget === "write"
            ? `Write rate limit exceeded: at most ${limit} write operations per minute are allowed. Please wait ~${retryAfterSeconds}s before trying again.`
            : `Read rate limit exceeded: at most ${limit} read operations per minute are allowed. Please wait ~${retryAfterSeconds}s before trying again.`,
      };
    }
  }

  let result: ToolResult;
  try {
    result = await tool.run(toolCtx, params as never);
  } catch (e) {
    if (policy.throwBehavior === "propagate") throw e;
    return { error: `Internal error in tool ${tool.name}` };
  }

  // Write audit (Task 7): every successful write-tool execution on every
  // transport is recorded. Reads are never logged. Failures (isError) are
  // not logged — nothing changed. Best-effort and never throws.
  if (tool.readOnly !== true && !result.isError) {
    appendAuditLog({
      userId: toolCtx.user.id,
      tool: tool.name,
      args: params,
      result: "ok",
    });
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
    const viewProps = result.viewProps ?? tool.toViewProps?.(result);
    return {
      content: result.content,
      ...(viewProps !== undefined ? { structuredContent: viewProps } : {}),
    };
  }

  if (result.isError)
    return errorResult(
      stripSecrets(extractText(result.content) ?? "Tool failed"),
    );
  const rawText = extractText(result.content) ?? "";
  // Central secret-strip on the model-visible text path: bearer tokens
  // (`shareToken`, `icalToken`) and private `notes` never reach model text,
  // even from a catalog tool that forgot its own per-row strip. Then the
  // central truncate (policy-supplied limit, unchanged semantics), then the
  // `<tool_output>` injection-boundary delimiters (Task 7, R5: success text
  // only — error envelopes are our own control messages and stay verbatim).
  const text = stripSecrets(rawText);
  if (policy.truncateAt !== undefined && text.length > policy.truncateAt)
    return textResult(
      wrapToolOutput(
        truncate(text, policy.truncateAt, policy.truncationNote ?? ""),
      ),
    );
  return textResult(wrapToolOutput(text));
}
