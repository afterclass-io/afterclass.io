import { timetablePage } from "@/server/mcp/tools/page-links";
import { timetableDetailOutput } from "./schemas";
import { registerViewTool } from "./make-view-tool";

// Shared lookup + named-throw + registration derivation.
export const getMyTimetableDetail = registerViewTool({
  name: "get-my-timetable-detail",
  view: { name: "timetable", description: "Weekly class timetable grid" },
  outputSchema: timetableDetailOutput,
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
});
