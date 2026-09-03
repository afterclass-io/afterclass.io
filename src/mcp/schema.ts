import type { StandardSchemaWithJSON } from "@modelcontextprotocol/server";
import type { z } from "zod";

/**
 * Narrow cast for tool schemas at the mcp-use boundary.
 *
 * mcp-use's `ToolDefinition` expects `StandardSchemaWithJSON` (Standard Schema
 * + `~standard.jsonSchema`). Zod v4 implements it, but the app (`zod@^4.5.x`)
 * and the SDK (`@modelcontextprotocol/core` bundles `zod@4.4.x`) resolve
 * different patch versions with incompatible internal `$Zod*` symbols. With
 * `skipLibCheck:true` the mismatch is hidden, but a direct `ZodType`-to-
 * `StandardSchemaWithJSON` assignment still trips the checker outside the
 * helper. Centralizing the `unknown` hop documents the SDK boundary and keeps
 * `as never` out of call sites. Runtime validation is enforced by
 * `bunx mcp-use typecheck` / `z.toJSONSchema` — non-serializable schemas
 * (e.g. `z.date()`) fail `tools/list` with `-32603`.
 */
export function asSchema<T extends z.ZodType>(schema: T): StandardSchemaWithJSON {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- keeps `as never` out of 8 call sites
  return schema as unknown as StandardSchemaWithJSON;
}
