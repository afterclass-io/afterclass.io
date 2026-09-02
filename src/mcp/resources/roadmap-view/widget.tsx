import type React from "react";
import type { WidgetMetadata } from "mcp-use/react";
import { z } from "zod";
import { useCtaFeedback } from "../shared/use-cta-feedback";
import { useWidget } from "../shared/use-widget";

import { TOKENS, Skeleton } from "../shared/tokens";

/**
 * Browser-iframe widget (MCP Apps) for `get-my-roadmap` / `get-public-roadmap`.
 * Must stay dependency-free: no `@/server/*`, no `next/*`.
 *
 * Props are the normalized RoadmapViewProps produced by each tool's
 * `toWidgetProps` in `src/server/mcp/tools/read/roadmap-detail.ts`:
 *   { roadmapId, name, isPublic, owner, voteCount, entries }
 */
const roadmapEntrySchema = z.object({
  yearNumber: z.number(),
  term: z.string(),
  courseCode: z.string(),
  courseName: z.string(),
  creditUnits: z.number().nullable(),
});

const roadmapViewPropsSchema = z.object({
  roadmapId: z.string(),
  name: z.string(),
  isPublic: z.boolean(),
  owner: z.string().nullable(),
  voteCount: z.number().nullable(),
  entries: z.array(roadmapEntrySchema),
});

export const widgetMetadata: WidgetMetadata = {
  description: "A course roadmap laid out by year and term",
  props: roadmapViewPropsSchema,
};

type RoadmapViewProps = z.infer<typeof roadmapViewPropsSchema>;

const TERM_ORDER = ["T1", "T2", "T3A", "T3B"] as const;

const RoadmapView: React.FC = () => {
  const { props, isPending, theme, callTool, isAvailable } = useWidget<RoadmapViewProps>() as unknown as {
    props: RoadmapViewProps;
    isPending: boolean;
    theme: string;
    isAvailable: boolean;
    callTool?: (name: string, input: Record<string, unknown>) => Promise<unknown>;
  };
  const dark = theme === "dark";
  const c = dark ? TOKENS.dark : TOKENS.light;
  const { feedback, showFeedback } = useCtaFeedback();
  if (isPending) return <Skeleton dark={dark} />;

  const years = [...new Set(props.entries.map((e) => e.yearNumber))].sort(
    (a, b) => a - b,
  );

  return (
    <div
      style={{
        fontFamily: "var(--font-inter, ui-sans-serif, system-ui)",
        color: c.cardFg,
        background: c.card,
        border: `1px solid ${c.border}`,
        borderRadius: c.radius,
        padding: 16,
        boxSizing: "border-box",
        maxWidth: 480,
      }}
    >
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      {/* Header: roadmap name + owner/votes subline for public roadmaps */}
      <div style={{ fontSize: 14, fontWeight: 600 }}>{props.name}</div>
      {props.isPublic && props.owner && (
        <div style={{ marginTop: 2, fontSize: 11, color: c.mutedFg }}>
          by {props.owner}
          {props.voteCount !== null && ` · ${props.voteCount} upvotes`}
        </div>
      )}
      {/* Body: one section per year, term columns in fixed order */}
      {years.length === 0 ? (
        <p style={{ margin: "12px 0 0", fontSize: 12, color: c.mutedFg }}>
          No courses in this roadmap yet.
        </p>
      ) : (
        years.map((year) => {
          const yearEntries = props.entries.filter(
            (e) => e.yearNumber === year,
          );
          const terms = TERM_ORDER.filter((t) =>
            yearEntries.some((e) => e.term === t),
          );
          return (
            <div key={year} style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>
                Year {year}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${terms.length}, 1fr)`,
                  gap: 8,
                  marginTop: 6,
                }}
              >
                {terms.map((term) => (
                  <div key={term}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: c.mutedFg,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {term}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        marginTop: 4,
                      }}
                    >
                      {yearEntries
                        .filter((e) => e.term === term)
                        .map((e) => (
                          <span
                            key={`${e.term}-${e.courseCode}`}
                            title={e.courseName}
                            style={{
                              display: "inline-block",
                              fontSize: 11,
                              padding: "3px 8px",
                              borderRadius: 9999,
                              border: `1px solid ${c.border}`,
                              background: c.card,
                            }}
                          >
                            <span
                              style={{
                                fontFamily:
                                  "var(--font-geist-mono, ui-monospace)",
                                fontWeight: 600,
                              }}
                            >
                              {e.courseCode}
                            </span>
                            {e.creditUnits !== null && (
                              <span style={{ color: c.mutedFg }}>
                                {" "}
                                {e.creditUnits} CU
                              </span>
                            )}
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
      {props.isPublic && isAvailable && callTool && (
        <button
          type="button"
          aria-label={feedback === "saved" ? "Copied \u2713" : feedback === "error" ? "Copy failed" : "Copy this roadmap"}
          aria-live="polite"
          onClick={() =>
            callTool("copy-public-roadmap", {
              roadmapId: props.roadmapId,
            })
              .then((res) => {
                const isError = (res as { isError?: boolean })?.isError === true;
                showFeedback(isError ? "error" : "saved");
              })
              .catch(() => showFeedback("error"))
          }
          style={{
            marginTop: 12,
            width: "100%",
            padding: "8px 16px",
            borderRadius: 9999,
            border: "none",
            background: feedback === "error" ? "oklch(0.6 0.2 20)" : c.primary,
            color: c.primaryFg,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {feedback === "saved"
            ? "Copied \u2713"
            : feedback === "error"
              ? "Copy failed"
              : "Copy this roadmap"}
        </button>
      )}
    </div>
  );
};

export default RoadmapView;
