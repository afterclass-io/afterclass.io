import { useWidget, type WidgetMetadata } from "mcp-use/react";
import { z } from "zod";

/**
 * Browser-iframe widget (MCP Apps) for `search-courses`.
 * Must stay dependency-free: no `@/server/*`, no `next/*`.
 *
 * Props mirror the shape produced by `searchCoursesTool.toWidgetProps`, which
 * wraps the JSON array the tool emits (from `timetable.searchCourses`) as
 * `{ results: [...] }`. Each course has `{ id, code, name, creditUnits,
 * sections }`.
 */
const courseSearchPropsSchema = z.object({
  results: z.array(
    z.object({
      id: z.string().optional(),
      code: z.string(),
      name: z.string(),
      creditUnits: z.number().optional(),
      sections: z
        .array(
          z.object({
            classId: z.string().optional(),
            section: z.string().optional(),
            professorName: z.string().nullable().optional(),
            timings: z
              .array(
                z.object({
                  dayOfWeek: z.string().nullable().optional(),
                  startTime: z.string().optional(),
                  endTime: z.string().optional(),
                  venue: z.string().nullable().optional(),
                }),
              )
              .optional(),
            examTimings: z
              .array(
                z.object({
                  date: z.union([z.string(), z.date()]).optional(),
                  startTime: z.string().optional(),
                  endTime: z.string().optional(),
                  venue: z.string().nullable().optional(),
                }),
              )
              .optional(),
          }),
        )
        .optional(),
    }),
  ),
});

export const widgetMetadata: WidgetMetadata = {
  description: "Course search results",
  props: courseSearchPropsSchema,
};

const CourseSearch: React.FC = () => {
  const { props, isPending, theme } = useWidget<z.infer<typeof courseSearchPropsSchema>>();
  if (isPending) return <div>Loading...</div>;
  const dark = theme === "dark";
  const results = props.results ?? [];
  return (
    <div style={{ maxWidth: 480 }}>
      <p style={{ opacity: 0.7 }}>{results.length} course(s) found</p>
      {results.map((r) => (
        <div
          key={r.id ?? r.code}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 12,
            marginBottom: 8,
            background: dark ? "#1a1a2e" : "#fff",
          }}
        >
          <strong>{r.code}</strong> - {r.name}
          {r.creditUnits !== undefined && (
            <span style={{ opacity: 0.7 }}> - {r.creditUnits} CU</span>
          )}
          {r.sections !== undefined && r.sections.length > 0 && (
            <span style={{ opacity: 0.7 }}> - {r.sections.length} section(s)</span>
          )}
          {r.sections !== undefined && r.sections.length > 0 && (
            <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>
              {r.sections.map((s) => (
                <div key={s.classId ?? s.section}>
                  {s.section}
                  {s.professorName ? ` - ${s.professorName}` : ""}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CourseSearch;
