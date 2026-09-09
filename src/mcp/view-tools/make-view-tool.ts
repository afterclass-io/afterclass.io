import { allTools } from "@/server/mcp/tools";

import { getToolRegistration } from "../annotations";
import type { asSchema } from "../schema";

/**
 * Named-throw catalog lookup: every view-tool adapter resolves
 * its catalog tool through here so a rename/drift fails loudly with the
 * tool name instead of a `Cannot read properties of undefined` TypeError
 * at registration time.
 */
export function catalogToolOrThrow(name: string) {
  const t = allTools.find((x) => x.name === name);
  if (!t) throw new Error(`[mcp] catalog tool missing: ${name}`);
  return t;
}

/**
 * Shared registration derivation for view-tool adapters: the
 * catalog tool + the tools/list title/description/annotations, so all 7
 * adapters show one consistent annotation story. Each adapter keeps its
 * bespoke tail (view binding, summarize, pipeline) this PR; the shared
 * lookup + named-throw is the win. (Full tail unification via
 * RunViewToolOptions.shapeArray is the tracked follow-up.)
 */
export function makeViewTool(opts: {
  name: string;
  view: { name: string; description: string; prefersBorder?: boolean };
  outputSchema: Parameters<typeof asSchema>[0];
  summarize: (data: unknown) => string;
  rawPayloadMessage: string;
}) {
  const tool = catalogToolOrThrow(opts.name);
  const registration = getToolRegistration(opts.name);
  return { tool, registration };
}
