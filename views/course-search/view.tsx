import type React from "react";
import type { ViewConfig } from "mcp-use/react";
import {
  useDynamicTool,
  useHostContext,
  useToolContext,
  useViewTheme,
} from "mcp-use/react";
import { useKeyedCtaFeedback } from "../shared/use-cta-feedback";
import { TOKENS, Skeleton } from "../shared/tokens";
import { normalizeDay } from "../shared/day";
import { formatExamDate } from "../shared/format";

/**
 * MCP App View (mcp-use v2) for the `search-courses` tool — the pilot of the
 * widget -> View migration (v1 vocabulary retired; v2 calls these Views). Must stay dependency-free: no `@/server/*`, no
 * `next/*`.
 *
 * The card layout, formatTiming, sections/CTA rendering and tokens are copied
 * verbatim from the v1 `resources/course-search/widget.tsx`; only the data
 * channels changed:
 *
 *   v1 useWidget().props.results         -> v2 useToolContext().toolOutput.results
 *   v1 useWidget().isPending             -> v2 status === "pending"
 *   v1 useWidget().theme                 -> v2 useViewTheme()
 *   v1 useWidget().callTool / isAvailable
 *                                        -> v2 useDynamicTool("add-class-to-timetable")
 *                                           + useHostContext().isAvailable
 */

export const viewConfig = {
  autoResize: true,
  displayModes: ["inline", "fullscreen", "pip"],
} satisfies ViewConfig;

/** One search result — mirrors `courseSearchOutput` (src/mcp/view-tools/schemas.ts). */
type CourseResult = {
  id?: string;
  code: string;
  name: string;
  description?: string;
  creditUnits?: number;
  sections?: Array<{
    classId?: string;
    section?: string;
    professorName?: string | null;
    timings?: Array<{
      dayOfWeek?: string | null;
      startTime?: string;
      endTime?: string;
      venue?: string | null;
    }>;
    examTimings?: Array<{
      date?: string;
      startTime?: string;
      endTime?: string;
      venue?: string | null;
    }>;
  }>;
};

// NOTE: tokens, Skeleton, and normalizeDay live in `../shared/*` now
// (relative imports above) — do NOT reintroduce local STOKENS/SearchSkeleton
// or DAY_NORMALIZE copies here. normalizeDay's unknown→null contract means
// formatTiming applies the raw fallback itself (`?? t.dayOfWeek ?? ""`).

function formatTiming(t: {
  dayOfWeek?: string | null;
  startTime?: string;
  endTime?: string;
  venue?: string | null;
}): string {
  const day = normalizeDay(t.dayOfWeek) ?? t.dayOfWeek ?? "";
  const time =
    t.startTime && t.endTime
      ? `${t.startTime}–${t.endTime}`
      : (t.startTime ?? "");
  const venue = t.venue ? ` @ ${t.venue}` : "";
  return [day, time].filter(Boolean).join(" ") + venue;
}

const CourseSearchView: React.FC = () => {
  const { status, toolOutput, error } = useToolContext<"search-courses">();
  const theme = useViewTheme();
  const dark = theme === "dark";
  const c = dark ? TOKENS.dark : TOKENS.light;
  // `toolOutput` is `{results: Course[]}` from the tool's outputSchema. The
  // tool adapter currently passes its schemas `as never` (Task 9 candidate to
  // tighten), so read defensively exactly like the v1 view read `props`.
  const results =
    (toolOutput as { results?: CourseResult[] } | undefined)?.results ?? [];
  const { feedback, showFeedback } = useKeyedCtaFeedback();
  // v1 called `callTool("add-class-to-timetable", { classId })` from
  // useWidget. add-class-to-timetable is viewless (not an exported ToolRef),
  // so the v2 escape hatch is useDynamicTool with an explicit contract.
  const addClass = useDynamicTool<{ classId: string; confirm: true }>(
    "add-class-to-timetable",
  );
  const { isAvailable } = useHostContext();

  if (status === "pending") return <Skeleton dark={dark} />;
  if (status === "error") {
    return (
      <div
        role="alert"
        style={{
          fontFamily: "var(--font-inter, ui-sans-serif)",
          color: c.cardFg,
          background: c.card,
          border: `1px solid ${c.border}`,
          borderRadius: c.radius,
          padding: 12,
        }}
      >
        {error.message}
      </div>
    );
  }
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
        width: "100%",
        maxWidth: "100%",
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
          {r.description !== undefined && r.description.length > 0 && (
            <p
              style={{
                fontSize: 12,
                marginTop: 4,
                marginBottom: 0,
                color: c.mutedFg,
              }}
            >
              {r.description}
            </p>
          )}
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
                              `${formatExamDate(e.date)} ${e.startTime ?? ""}–${e.endTime ?? ""}${e.venue ? ` @ ${e.venue}` : ""}`,
                          )
                          .join(" · ")}
                      </span>
                    )}
                  </span>
                  {s.classId &&
                    isAvailable &&
                    (() => {
                      // s.classId truthy above — narrow to string for map key
                      const classId: string = s.classId;
                      const fb = feedback[classId];
                      const label =
                        fb === "saved"
                          ? "Saved \u2713"
                          : fb === "error"
                            ? "Failed"
                            : `Add ${s.section} — confirm to enroll`;
                      return (
                        <button
                          type="button"
                          aria-live="polite"
                          onClick={() =>
                            // v2: tool errors reject (ToolError) instead of
                            // resolving isError:true, so "Failed" moves to catch.
                            addClass
                              .callTool({ classId, confirm: true })
                              .then(() => showFeedback(classId, "saved"))
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

export default CourseSearchView;
