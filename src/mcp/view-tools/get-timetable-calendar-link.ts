import { server } from "../server";
import { asSchema } from "../schema";
import { dispatchToolCall } from "../dispatch";
import { calendarLinksOutput } from "./schemas";
import { errorResult, guardedParse } from "./results";
import { makeViewTool } from "./make-view-tool";

// Shared lookup + named-throw + registration derivation (Task 11).
// This adapter is destructive (PRIVATE → UNLISTED escalation), so the
// derivation also surfaces the confirm:true requirement in tools/list.
const { tool, registration } = makeViewTool({
  name: "get-timetable-calendar-link",
  view: { name: "calendar-links", description: "Calendar subscribe links" },
  outputSchema: calendarLinksOutput,
  summarize: () => "",
  rawPayloadMessage: "Invalid calendar links payload",
});

export const getTimetableCalendarLink = server.tool(
  {
    name: "get-timetable-calendar-link",
    title: registration.title,
    description: registration.description,
    inputSchema: asSchema(tool.inputSchema),
    outputSchema: asSchema(calendarLinksOutput),
    annotations: registration.annotations,
    view: {
      name: "calendar-links",
      description: "Calendar subscribe links",
      prefersBorder: true,
    },
  },
  async (params, ctx) => {
    // Auth + write-budget + run via the single shared pipeline (`shape:
    // "view"` preserves the viewProps channel; this bespoke adapter keeps
    // its secret-splitting tail: secret URLs stay in `_meta`, only the safe
    // `{ timetableId, madeLinkShareable? }` enters `structuredContent`).
    // Confirm-all-writes (Task 7): the dispatch confirm-gate applies
    // (get-timetable-calendar-link is in `destructiveTools` — it can escalate
    // PRIVATE → UNLISTED); the schema declares `confirm`, so confirm:true
    // survives validation, and the tool's own escalation logic is unchanged.
    const out = await dispatchToolCall({
      tool: tool,
      params,
      ctx,
      policy: {
        confirm: true,
        budget: "write",
        shape: "view",
        confirmSecret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
      },
    });
    if ("error" in out) return errorResult(out.error);
    if (out.isError) return errorResult(out.content[0]?.text ?? "Tool failed");
    const result = {
      content: out.content,
      viewProps: out.structuredContent as Record<string, unknown> | undefined,
    };
    // viewProps carries the secret-bearing URLs — NEVER put them in structuredContent
    const viewProps =
      result.viewProps ??
      (tool.toViewProps ? tool.toViewProps(result) : undefined);
    const timetableId = viewProps?.timetableId as string | undefined;
    if (!timetableId)
      return errorResult("Missing timetableId in calendar response");
    const madeLinkShareable = viewProps?.madeLinkShareable as
      | boolean
      | undefined;
    const structuredContent: Record<string, unknown> = { timetableId };
    if (typeof madeLinkShareable === "boolean")
      structuredContent.madeLinkShareable = madeLinkShareable;
    const parsed = guardedParse(calendarLinksOutput, structuredContent);
    if (!parsed.ok) return errorResult("Output schema validation failed");
    // Validated _meta construction (Task 11): only non-empty strings enter
    // the secret-bearing URLs — never undefined/non-string casts.
    const str = (v: unknown): string | undefined =>
      typeof v === "string" && v.length > 0 ? v : undefined;
    const meta = viewProps
      ? {
          feedUrl: str(viewProps.feedUrl),
          subscribeUrl: str(viewProps.subscribeUrl),
          googleSubscribeUrl: str(viewProps.googleSubscribeUrl),
          appleSubscribeUrl: str(viewProps.appleSubscribeUrl),
          outlookSubscribeUrl: str(viewProps.outlookSubscribeUrl),
        }
      : undefined;
    const hasMeta =
      meta &&
      Object.values(meta).some((v) => typeof v === "string" && v.length > 0);
    return {
      content: [
        {
          type: "text" as const,
          text: result.content[0]?.text ?? "Calendar links ready",
        },
      ],
      structuredContent,
      ...(hasMeta ? { _meta: meta } : {}),
    };
  },
);
