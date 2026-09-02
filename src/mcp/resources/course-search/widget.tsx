import type React from "react";
import type { WidgetMetadata } from "mcp-use/react";
import { z } from "zod";
import { useKeyedCtaFeedback } from "../shared/use-cta-feedback";
import { useWidget } from "../shared/use-widget";

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

const STOKENS = {
  light: {
    card: "oklch(0.99 0 0)",
    cardFg: "oklch(0.141 0.005 285.823)",
    mutedFg: "oklch(0.552 0.016 285.938)",
    border: "oklch(0.92 0.004 286.32)",
    muted: "oklch(0.967 0.001 286.375)",
    primary: "oklch(0.48 0.2229 280.55)",
    primaryFg: "oklch(0.969 0.016 293.756)",
    radius: "0.75rem",
  },
  dark: {
    card: "oklch(0.21 0.006 285.885)",
    cardFg: "oklch(0.985 0 0)",
    mutedFg: "oklch(0.705 0.015 286.067)",
    border: "oklch(1 0 0 / 10%)",
    muted: "oklch(0.274 0.006 286.033)",
    primary: "oklch(0.585 0.233 277.117)",
    primaryFg: "oklch(0.969 0.016 293.756)",
    radius: "0.75rem",
  },
} as const;

function formatTiming(t: {
  dayOfWeek?: string | null;
  startTime?: string;
  endTime?: string;
  venue?: string | null;
}): string {
  const day = t.dayOfWeek ?? "";
  const time =
    t.startTime && t.endTime
      ? `${t.startTime}–${t.endTime}`
      : (t.startTime ?? "");
  const venue = t.venue ? ` @ ${t.venue}` : "";
  return [day, time].filter(Boolean).join(" ") + venue;
}

const SearchSkeleton: React.FC<{ dark: boolean }> = ({ dark }) => {
  const c = dark ? STOKENS.dark : STOKENS.light;
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
      aria-label="Loading"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            height: 72,
            borderRadius: c.radius,
            background: c.muted,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      ))}
      <span
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
        }}
      >
        Loading...
      </span>
    </div>
  );
};

const CourseSearch: React.FC = () => {
  const { props, isPending, theme, callTool, isAvailable } = useWidget<
    z.infer<typeof courseSearchPropsSchema>
  >() as unknown as {
    props: z.infer<typeof courseSearchPropsSchema>;
    isPending: boolean;
    theme: string;
    isAvailable: boolean;
    callTool?: (
      name: string,
      input: Record<string, unknown>,
    ) => Promise<unknown>;
  };
  const dark = theme === "dark";
  const c = dark ? STOKENS.dark : STOKENS.light;
  const results = props.results ?? [];
  const { feedback, showFeedback } = useKeyedCtaFeedback();
  if (isPending) return <SearchSkeleton dark={dark} />;
  if (results.length === 0) {
    return (
      <div
        style={{
          fontFamily: "var(--font-inter, ui-sans-serif)",
          color: c.cardFg,
          border: `1px dashed ${c.border}`,
          background: dark
            ? "oklch(0.274 0.006 286.033 / 30%)"
            : "oklch(0.967 0.001 286.375 / 30%)",
          borderRadius: c.radius,
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 14 }}>No courses found</div>
        <div style={{ fontSize: 12, color: c.mutedFg, marginTop: 4 }}>
          Try a broader search term or check the academic term.
        </div>
      </div>
    );
  }
  return (
    <div
      style={{
        fontFamily: "var(--font-inter, ui-sans-serif)",
        color: c.cardFg,
        maxWidth: 520,
        boxSizing: "border-box",
      }}
    >
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      <div style={{ fontSize: 12, color: c.mutedFg, marginBottom: 8 }}>
        {results.length} course(s) found
      </div>
      {results.map((r) => (
        <div
          key={r.id ?? r.code}
          style={{
            border: `1px solid ${c.border}`,
            borderRadius: c.radius,
            padding: 12,
            marginBottom: 8,
            background: c.card,
            color: c.cardFg,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-geist-mono, ui-monospace)",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {r.code}
            </span>
            {r.creditUnits !== undefined && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 9999,
                  background: dark
                    ? "oklch(0.274 0.006 286.033)"
                    : "oklch(0.967 0.001 286.375)",
                  color: c.mutedFg,
                  border: `1px solid ${c.border}`,
                }}
              >
                {r.creditUnits} CU
              </span>
            )}
            {r.sections !== undefined && r.sections.length > 0 && (
              <span style={{ fontSize: 11, color: c.mutedFg }}>
                {r.sections.length} section(s)
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, marginTop: 2 }}>{r.name}</div>
          {r.sections !== undefined && r.sections.length > 0 && (
            <div
              style={{
                marginTop: 8,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {r.sections.map((s) => (
                <div
                  key={s.classId ?? s.section}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    fontSize: 12,
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: dark
                      ? "oklch(0.274 0.006 286.033 / 50%)"
                      : "oklch(0.967 0.001 286.375 / 60%)",
                  }}
                >
                  <span>
                    <span
                      style={{
                        fontFamily: "var(--font-geist-mono, ui-monospace)",
                        fontWeight: 500,
                      }}
                    >
                      {s.section ?? "—"}
                    </span>
                    {s.professorName ? (
                      <span style={{ color: c.mutedFg }}>
                        {" "}
                        · {s.professorName}
                      </span>
                    ) : (
                      <span style={{ color: c.mutedFg }}> · TBA</span>
                    )}
                    {s.timings && s.timings.length > 0 && (
                      <span style={{ color: c.mutedFg }}>
                        {" "}
                        · {s.timings.map(formatTiming).join(" · ")}
                      </span>
                    )}
                    {s.examTimings && s.examTimings.length > 0 && (
                      <span style={{ color: c.mutedFg }}>
                        {" "}
                        · Exam:{" "}
                        {s.examTimings
                          .map(
                            (e) =>
                              `${String(e.date ?? "").slice(0, 10)} ${e.startTime ?? ""}–${e.endTime ?? ""}${e.venue ? ` @ ${e.venue}` : ""}`,
                          )
                          .join(" · ")}
                      </span>
                    )}
                  </span>
                  {s.classId && isAvailable && callTool && (() => {
                    // s.classId truthy above — narrow to string for map key
                    const classId: string = s.classId;
                    const fb = feedback[classId];
                    const label =
                      fb === "saved"
                        ? "Saved \u2713"
                        : fb === "error"
                          ? "Failed"
                          : `Add ${s.section}`;
                    return (
                      <button
                        type="button"
                        aria-live="polite"
                        onClick={() =>
                          callTool("add-class-to-timetable", { classId })
                            .then((res) => {
                              const isError =
                                (res as { isError?: boolean })?.isError === true;
                              showFeedback(classId, isError ? "error" : "saved");
                            })
                            .catch(() => showFeedback(classId, "error"))
                        }
                        style={
                          {
                            shrink: 0,
                            padding: "2px 10px",
                            borderRadius: 9999,
                            border: `1px solid ${c.primary}`,
                            background: c.primary,
                            color: fb === "error" ? "white" : c.primaryFg,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          } as unknown as React.CSSProperties
                        }
                      >
                        {label}
                      </button>
                    );
                  })()}
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
