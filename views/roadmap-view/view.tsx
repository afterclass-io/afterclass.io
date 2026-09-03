import type React from "react";
import type { ViewConfig } from "mcp-use/react";
import { useDynamicTool, useHostContext, useToolContext, useViewTheme } from "mcp-use/react";
import type { RoadmapViewData } from "../../src/mcp/view-tools/schemas";
import { useCtaFeedback } from "../shared/use-cta-feedback";
import { TOKENS, Skeleton } from "../shared/tokens";

/**
 * MCP App View (mcp-use v2) for the `get-my-roadmap` tool. Must stay
 * dependency-free: no `@/server/*`, no `next/*`.
 *
 * The year/term grid, owner/votes subline and tokens are copied verbatim from
 * the v1 `resources/roadmap-view/widget.tsx`; only the data channels changed:
 *
 *   v1 useWidget().props            -> v2 useToolContext().toolOutput
 *   v1 useWidget().isPending        -> v2 status === "pending"
 *   v1 useWidget().theme            -> v2 useViewTheme()
 *   v1 useWidget().callTool         -> v2 useDynamicTool("copy-public-roadmap")
 *   v1 widgetMetadata export        -> v2 viewConfig export
 *
 * The copy CTA only renders when the roadmap is public; copy-public-roadmap
 * is viewless (not an exported ToolRef), so the v2 escape hatch is
 * useDynamicTool with an explicit contract.
 */

export const viewConfig = {
  autoResize: true,
  displayModes: ["inline", "fullscreen", "pip"],
} satisfies ViewConfig;

const TERM_ORDER = ["T1", "T2", "T3A", "T3B"] as const;

const RoadmapView: React.FC = () => {
  const { status, toolOutput, error } = useToolContext<"get-my-roadmap">();
  const theme = useViewTheme();
  const dark = theme === "dark";
  const c = dark ? TOKENS.dark : TOKENS.light;
  const { feedback, showFeedback } = useCtaFeedback();
  const copyRoadmap = useDynamicTool<{ roadmapId: string }>(
    "copy-public-roadmap",
  );
  const { isAvailable } = useHostContext();

  if (status === "pending") return <Skeleton dark={dark} />;
  if (status === "error") {
    return (
      <div
        role="alert"
        style={{
          fontFamily: "var(--font-inter, ui-sans-serif, system-ui)",
          color: c.cardFg,
          background: c.card,
          border: `1px solid ${c.border}`,
          borderRadius: c.radius,
          padding: 16,
        }}
      >
        {error.message}
      </div>
    );
  }
  // `toolOutput` is the normalized RoadmapView from the tool's outputSchema.
  // The tool adapter currently passes its schemas `as never` (Task 9
  // candidate to tighten), so read defensively like the v1 widget read props.
  const props = toolOutput as RoadmapViewData | undefined;
  const entries = props?.entries ?? [];
  const name = props?.name ?? "";
  const isPublic = props?.isPublic === true;

  const years = [...new Set(entries.map((e) => e.yearNumber))].sort(
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
      <div style={{ fontSize: 14, fontWeight: 600 }}>{name}</div>
      {isPublic && props?.owner && (
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
          const yearEntries = entries.filter((e) => e.yearNumber === year);
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
      {isPublic && isAvailable && props?.roadmapId && (
        <button
          type="button"
          aria-label={feedback === "saved" ? "Copied \u2713" : feedback === "error" ? "Copy failed" : "Copy this roadmap"}
          aria-live="polite"
          onClick={() => {
            // props.roadmapId truthy above — narrow to string for the call.
            const roadmapId: string = props.roadmapId;
            // v2: tool errors reject (ToolError) instead of resolving
            // isError:true, so "Copy failed" moves to catch.
            copyRoadmap
              .callTool({ roadmapId })
              .then(() => showFeedback("saved"))
              .catch(() => showFeedback("error"));
          }}
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
