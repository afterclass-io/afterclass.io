import { server } from "../server";
import { allTools } from "@/server/mcp/tools";
import { getToolRegistration } from "../annotations";
import { asSchema } from "../schema";
import { dispatchToolCall } from "../dispatch";
import { calendarLinksOutput } from "./schemas";
import { errorResult, guardedParse } from "./results";

const tool = allTools.find((t) => t.name === "get-timetable-calendar-link")!;

// Routed through the shared derivation (Task 11) — see search-courses.ts.
// This adapter is destructive (PRIVATE → UNLISTED escalation), so the
// derivation also surfaces the confirm:true requirement in tools/list.
const registration = getToolRegistration("get-timetable-calendar-link");

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
      tool: tool as never,
      params,
      ctx,
      policy: { confirm: true, budget: "write", shape: "view" },
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
    const meta = viewProps
      ? {
          feedUrl: viewProps.feedUrl as string | undefined,
          subscribeUrl: viewProps.subscribeUrl as string | undefined,
          googleSubscribeUrl: viewProps.googleSubscribeUrl as
            | string
            | undefined,
          appleSubscribeUrl: viewProps.appleSubscribeUrl as string | undefined,
          outlookSubscribeUrl: viewProps.outlookSubscribeUrl as
            | string
            | undefined,
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
