import { server } from "../server";
import { allTools } from "@/server/mcp/tools";
import { asSchema } from "../schema";
import { buildToolContext } from "../user";
import { checkWriteBudget } from "../rate-limit";
import { calendarLinksOutput } from "./schemas";
import { errorResult, guardedParse } from "./results";

const tool = allTools.find((t) => t.name === "get-timetable-calendar-link")!;

export const getTimetableCalendarLink = server.tool(
  {
    name: "get-timetable-calendar-link",
    description: tool.description,
    inputSchema: asSchema(tool.inputSchema),
    outputSchema: asSchema(calendarLinksOutput),
    view: { name: "calendar-links", description: "Calendar subscribe links", prefersBorder: true },
  },
  async (params, ctx) => {
    const toolCtx = await buildToolContext(ctx as never);
    if (!toolCtx) return errorResult("Unauthorized");
    const limited = await checkWriteBudget(toolCtx);
    if (limited) return errorResult(limited);
    const result = await tool.run(toolCtx, params);
    if (result.isError) return errorResult(result.content[0]?.text ?? "Tool failed");
    // widgetProps carries the secret-bearing URLs — NEVER put them in structuredContent
    const widgetProps = (result.widgetProps ?? (tool.toWidgetProps ? tool.toWidgetProps(result) : undefined));
    const timetableId = widgetProps?.timetableId as string | undefined;
    if (!timetableId) return errorResult("Missing timetableId in calendar response");
    const madeLinkShareable = widgetProps?.madeLinkShareable as boolean | undefined;
    const structuredContent: Record<string, unknown> = { timetableId };
    if (typeof madeLinkShareable === "boolean") structuredContent.madeLinkShareable = madeLinkShareable;
    const parsed = guardedParse(calendarLinksOutput, structuredContent);
    if (!parsed.ok) return errorResult("Output schema validation failed");
    const meta = widgetProps
      ? {
          feedUrl: widgetProps.feedUrl as string | undefined,
          subscribeUrl: widgetProps.subscribeUrl as string | undefined,
          googleSubscribeUrl: widgetProps.googleSubscribeUrl as string | undefined,
          appleSubscribeUrl: widgetProps.appleSubscribeUrl as string | undefined,
          outlookSubscribeUrl: widgetProps.outlookSubscribeUrl as string | undefined,
        }
      : undefined;
    const hasMeta = meta && Object.values(meta).some((v) => typeof v === "string" && v.length > 0);
    return {
      content: [{ type: "text" as const, text: result.content[0]?.text ?? "Calendar links ready" }],
      structuredContent,
      ...(hasMeta ? { _meta: meta } : {}),
    };
  },
);
