import type React from "react";
import type { ViewConfig } from "mcp-use/react";
import { useToolContext, useViewTheme } from "mcp-use/react";
import type { BidPlan } from "../../src/mcp/view-tools/schemas";
import { Skeleton, TOKENS } from "../shared/tokens";

/**
 * MCP App View (mcp-use v2) for the `my-bid-plan` tool. Must stay
 * dependency-free: no `@/server/*`, no `next/*`.
 *
 * The card layout, statusStyle and tokens are copied verbatim from the v1
 * `resources/bid-plan/widget.tsx`; only the data channels changed:
 *
 *   v1 useWidget().props            -> v2 useToolContext().toolOutput
 *   v1 useWidget().isPending        -> v2 status === "pending"
 *   v1 useWidget().theme            -> v2 useViewTheme()
 *   v1 widgetMetadata export        -> v2 viewConfig export
 *
 * No write CTAs: upsert-bid and friends are viewless tools the model calls
 * directly (Controller Ruling §0.7).
 */

export const viewConfig = {
  autoResize: true,
  displayModes: ["inline", "fullscreen", "pip"],
} satisfies ViewConfig;

function statusStyle(status: string, dark: boolean): React.CSSProperties {
  const c = dark ? TOKENS.dark : TOKENS.light;
  if (status === "SECURED") {
    return {
      background: c.primary,
      color: c.primaryFg,
      border: "none",
    };
  }
  if (status === "PLANNED") {
    return {
      background: c.card,
      color: c.cardFg,
      border: `1px solid ${c.border}`,
    };
  }
  // DROPPED / CANCELLED / unknown — muted
  return {
    background: dark ? "oklch(0.274 0.006 286.033)" : "oklch(0.967 0.001 286.375)",
    color: c.mutedFg,
    border: `1px solid ${c.border}`,
  };
}

const BidPlanView: React.FC = () => {
  const { status, toolOutput, error } = useToolContext<"my-bid-plan">();
  const theme = useViewTheme();
  const dark = theme === "dark";
  const c = dark ? TOKENS.dark : TOKENS.light;
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
  // `toolOutput` is the unwrapped BidPlan from the tool's outputSchema. The
  // tool adapter currently passes its schemas `as never` (Task 9 candidate to
  // tighten), so read defensively exactly like the v1 widget read `props`.
  const props = toolOutput as BidPlan | undefined;
  const bids = props?.bids ?? [];
  const acadTermId = props?.acadTermId ?? "";
  const budget = props?.budget ?? null;

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
        width: "100%",
        maxWidth: "100%",
      }}
    >
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Your bid plan</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 9999,
            background: dark ? "oklch(0.488 0.243 264.376 / 15%)" : "oklch(0.546 0.245 262.881 / 12%)",
            color: dark ? "oklch(0.623 0.214 259.815)" : "oklch(0.488 0.243 264.376)",
            border: `1px solid ${c.border}`,
          }}
        >
          {acadTermId}
        </span>
      </div>

      {/* Budget row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 12,
          padding: "8px 10px",
          borderRadius: 8,
          border: `1px solid ${c.border}`,
          background: dark ? "oklch(0.274 0.006 286.033)" : "oklch(0.967 0.001 286.375)",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 500, color: c.mutedFg }}>Budget balance</span>
        {budget ? (
          <span style={{ fontSize: 14, fontWeight: 600 }}>${budget.balance}</span>
        ) : (
          <span style={{ fontSize: 12, color: c.mutedFg }}>No budget set</span>
        )}
      </div>

      {/* Bids */}
      {bids.length === 0 ? (
        <div style={{ marginTop: 12, fontSize: 13, color: c.mutedFg, textAlign: "center", padding: "16px 0" }}>
          No bids planned for this term yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {bids.map((bid) => (
            <div
              key={bid.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 8,
                border: `1px solid ${c.border}`,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-geist-mono, ui-monospace)",
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    {bid.courseCode}
                  </span>
                  <span style={{ fontSize: 11, color: c.mutedFg }}>{bid.section}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "1px 6px",
                      borderRadius: 9999,
                      ...statusStyle(bid.status, dark),
                    }}
                  >
                    {bid.status}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: c.mutedFg,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginTop: 2,
                  }}
                >
                  {bid.courseName}
                  {bid.professorName ? ` · ${bid.professorName}` : ""}
                  {` · Round ${bid.round} W${bid.window}`}
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>${bid.bidAmount}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BidPlanView;
