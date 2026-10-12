import { allTools } from "@/server/mcp/tools";

import { getToolRegistration } from "../annotations";
import { asSchema } from "../schema";
import { server } from "../server";
import { runViewTool } from "./results";

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
 * adapters show one consistent annotation story. The view-tool tail is
 * `registerViewTool` below; `searchCourses` keeps a bespoke tail.
 */
export function makeViewTool(opts: {
  name: string;
  view: { name: string; description: string; prefersBorder?: boolean };
  outputSchema: Parameters<typeof asSchema>[0];
  summarize: (data: unknown, params: unknown) => string;
  rawPayloadMessage: string;
}) {
  const tool = catalogToolOrThrow(opts.name);
  const registration = getToolRegistration(opts.name);
  return { tool, registration };
}

/**
 * Registers an object-shaped view tool: catalog title/description/annotations,
 * the shared `runViewTool` pipeline, and a bordered view binding. `summarize`
 * also receives the adapter's input params.
 */
export function registerViewTool(opts: {
  name: string;
  view: { name: string; description: string };
  outputSchema: Parameters<typeof asSchema>[0];
  summarize: (data: unknown, params: unknown) => string;
  rawPayloadMessage: string;
}) {
  const { tool, registration } = makeViewTool(opts);
  return server.tool(
    {
      name: opts.name,
      title: registration.title,
      description: registration.description,
      inputSchema: asSchema(tool.inputSchema),
      outputSchema: asSchema(opts.outputSchema),
      annotations: registration.annotations,
      view: {
        name: opts.view.name,
        description: opts.view.description,
        prefersBorder: true,
      },
    },
    async (params, ctx) =>
      runViewTool({
        ctx,
        params,
        tool,
        schema: opts.outputSchema,
        rawPayloadMessage: opts.rawPayloadMessage,
        summarize: (data) => opts.summarize(data, params),
      }),
  );
}
