import { useWidget, type WidgetMetadata } from "mcp-use/react";
import { z } from "zod";

import { Skeleton, TOKENS } from "../shared/tokens";

const bidPlanEntrySchema = z.object({
  id: z.string(),
  bidAmount: z.number(),
  status: z.string(),
  courseCode: z.string(),
  courseName: z.string(),
  section: z.string(),
  professorName: z.string().nullable(),
  round: z.string(),
  window: z.number(),
});

const bidPlanPropsSchema = z.object({
  acadTermId: z.string(),
  budget: z.object({ balance: z.number() }).nullable(),
  bids: z.array(bidPlanEntrySchema),
});

export const widgetMetadata: WidgetMetadata = {
  description: "Bidding plan for an academic term",
  props: bidPlanPropsSchema,
};

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

const BidPlan: React.FC = () => {
  const { props, isPending, theme } = useWidget<z.infer<typeof bidPlanPropsSchema>>() as unknown as {
    props: z.infer<typeof bidPlanPropsSchema>;
    isPending: boolean;
    theme: string;
  };
  const dark = theme === "dark";
  const c = dark ? TOKENS.dark : TOKENS.light;
  if (isPending) return <Skeleton dark={dark} />;

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
          {props.acadTermId}
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
        {props.budget ? (
          <span style={{ fontSize: 14, fontWeight: 600 }}>${props.budget.balance}</span>
        ) : (
          <span style={{ fontSize: 12, color: c.mutedFg }}>No budget set</span>
        )}
      </div>

      {/* Bids */}
      {props.bids.length === 0 ? (
        <div style={{ marginTop: 12, fontSize: 13, color: c.mutedFg, textAlign: "center", padding: "16px 0" }}>
          No bids planned for this term yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {props.bids.map((bid) => (
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

export default BidPlan;
