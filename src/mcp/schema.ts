import type { StandardSchemaWithJSON } from "@modelcontextprotocol/server";
import type { z } from "zod";

/**
 * Narrow cast for tool schemas at the mcp-use boundary.
 *
 * mcp-use's `ToolDefinition` expects `StandardSchemaWithJSON` (Standard Schema
 * + `~standard.jsonSchema`). Zod v4 implements it, but the app and the SDK
 * resolve zod from different copies with incompatible internal `$Zod*`
 * symbols: the app pins `zod@4.5.4` (`package.json` dependencies + overrides,
 * single `bun.lock` entry — verified in Task 6), while the SDK bundles its
 * own zod copy (`node_modules/@modelcontextprotocol/server/node_modules/zod`
 * exists). Pinning cannot collapse the copies — the bundled copy is not
 * governed by our overrides — so the `unknown` hop stays: it documents the
 * SDK boundary and keeps `as never` out of call sites. With
 * `skipLibCheck:true` the mismatch is hidden, but a direct `ZodType`-to-
 * `StandardSchemaWithJSON` assignment still trips the checker outside the
 * helper. Runtime validation is enforced by
 * `bunx mcp-use typecheck` / `z.toJSONSchema` — non-serializable schemas
 * (e.g. `z.date()`) fail `tools/list` with `-32603`.
 */
export function asSchema<T extends z.ZodType>(
  schema: T,
): StandardSchemaWithJSON {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- keeps `as never` out of 8 call sites
  return schema as unknown as StandardSchemaWithJSON;
}
