import { server } from "../server";
import { timetablePage } from "@/server/mcp/tools/page-links";
import { asSchema } from "../schema";
import { timetableDetailOutput } from "./schemas";
import { runViewTool } from "./results";
import { makeViewTool } from "./make-view-tool";

// Shared lookup + named-throw + registration derivation.
const { tool, registration } = makeViewTool({
  name: "get-my-timetable-detail",
  view: { name: "timetable", description: "Weekly class timetable grid" },
  outputSchema: timetableDetailOutput,
  summarize: () => "",
  rawPayloadMessage: "Invalid timetable payload",
});

export const getMyTimetableDetail = server.tool(
  {
    name: "get-my-timetable-detail",
    title: registration.title,
    description: registration.description,
    inputSchema: asSchema(tool.inputSchema),
    outputSchema: asSchema(timetableDetailOutput),
    annotations: registration.annotations,
    view: {
      name: "timetable",
      description: "Weekly class timetable grid",
      prefersBorder: true,
    },
  },
  async (params, ctx) =>
    runViewTool({
      ctx,
      params,
      tool,
      schema: timetableDetailOutput,
      rawPayloadMessage: "Invalid timetable payload",
      summarize: (data) => {
        const sc = data as {
          name?: string;
          slots?: Array<{
            day?: string | null;
            startTime?: string;
            endTime?: string;
            courseCode?: string;
            section?: string;
            professor?: string | null;
          }>;
        };
        const slots = Array.isArray(sc.slots) ? sc.slots : [];
        const head = `Timetable "${sc.name ?? ""}" — ${slots.length} classes`;
        const link = `\nOpen timetable: ${timetablePage()}`;
        if (slots.length === 0) return `${head}${link}`;
        // One line per weekly class timing: day + time band + code/section.
        const lines = slots.map((s) => {
          const when = `${s.day ?? "?"} ${s.startTime ?? ""}-${s.endTime ?? ""}`;
          const prof = s.professor ? ` (${s.professor})` : "";
          return `${when}: ${s.courseCode} ${s.section}${prof}`;
        });
        return `${head}:\n${lines.join("\n")}${link}`;
      },
    }),
);
