import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { SessionUser } from "@/server/auth/config";
import type { createCaller } from "@/server/api/root";

/** A tRPC server-side caller, typed like `createCaller(...)`. */
export type RouterCaller = ReturnType<typeof createCaller>;

/** Everything a tool handler needs. `caller` is already scoped to `user`. */
export interface ToolContext {
  user: SessionUser;
  caller: RouterCaller;
}

/** The result shape a tool handler returns. Mirrors the MCP SDK's CallToolResult. */
export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  /** Widget-only props channel. When present, view-tools adapters surface
   *  these to the bound View INSTEAD of toWidgetProps(result), so bearer
   *  secrets (e.g. iCal URLs) never enter model-visible text. */
  widgetProps?: Record<string, unknown>;
}

/** A single AI-visible skill. `run` must never throw; return errText instead. */
export interface McpTool<TSchema extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  inputSchema: TSchema;
  readOnly?: boolean;
  // Method syntax (not an arrow-property) keeps `TSchema` non-contravariant under
  // `strictFunctionTypes` so `McpTool<ZodObject<...>>` stays assignable to
  // `McpTool<z.ZodType>` (needed for `allTools: McpTool[]`). No runtime difference.
  run(ctx: ToolContext, input: z.infer<TSchema>): Promise<ToolResult>;

  /** Optional extractor for the bound View's props (see view-tools adapters). */
  toWidgetProps?: (result: ToolResult) => Record<string, unknown>;
}

export const okText = (text: string): ToolResult => ({
  content: [{ type: "text", text }],
});

export const jsonText = (value: unknown): ToolResult => {
  try {
    return okText(JSON.stringify(value, null, 2));
  } catch {
    return okText(String(value));
  }
};

export const errText = (text: string): ToolResult => ({
  content: [{ type: "text", text }],
  isError: true,
});

export const errorMessage = (e: unknown): string => {
  // tRPC errors carry a machine-stable `code` (e.g. NOT_FOUND, FORBIDDEN,
  // CONFLICT) the tools already surface as friendly model text — pass them
  // through unchanged. The friendly strings below (procedure-level messages)
  // must also reach the model verbatim.
  if (e instanceof TRPCError) return e.message;
  if (e instanceof Error) {
    // Prisma constraint noise (unique/foreign-key violations, raw DB text)
    // would otherwise leak storage internals to the model surface; map it to
    // a generic retry message. Match on `code` (P2002/P2003) and on message
    // text for drivers that surface the failure without a code.
    const code = (e as { code?: unknown }).code;
    const msg = e.message;
    if (
      code === "P2002" ||
      code === "P2003" ||
      /unique constraint|foreign key constraint|violates .*constraint/i.test(
        msg,
      )
    ) {
      return "Could not complete that change — refresh and try again.";
    }
    return msg;
  }
  if (typeof e === "string") return e;
  return String(e);
};

/** Parse a tool's JSON-text `ToolResult` back into widget props. */
export const parseWidgetJson = (result: {
  content: Array<{ type: "text"; text: string }>;
}): { data: Record<string, unknown> } | { raw: string } => {
  const text = result.content.find((c) => c.type === "text")?.text ?? "";
  try {
    return { data: JSON.parse(text) as Record<string, unknown> };
  } catch {
    return { raw: text };
  }
};

/**
 * Optional `confirm` field for destructive/full-replace tool schemas.
 *
 * Both dispatch layers (MCP SDK, AI SDK) validate args against the tool's
 * zod schema before the handler runs and strip unknown keys — so the
 * `checkDestructiveConfirm` gate in `src/mcp/rate-limit.ts` can only ever see
 * `confirm:true` when the schema declares it. Every tool in
 * `destructiveTools` must spread this field into its inputSchema; handlers
 * ignore it (destructured away or stripped again by the downstream tRPC
 * procedure's own input schema) — it exists only to survive validation.
 */
export const confirmField = {
  confirm: z
    .boolean()
    .optional()
    .describe(
      "Required for this destructive/full-replace write: pass confirm:true only after showing the user exactly what will change and getting explicit approval. The first call without it is rejected with instructions.",
    ),
};
