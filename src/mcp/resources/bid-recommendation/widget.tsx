import { useWidget, type WidgetMetadata } from "mcp-use/react";
import { z } from "zod";

/**
 * Browser-iframe widget (MCP Apps) for `recommend-bid-amount`.
 * Must stay dependency-free: no `@/server/*`, no `next/*`.
 *
 * Props mirror the exact JSON the tool emits via `jsonText(...)` in
 * `src/server/mcp/tools/write/recommend.ts`:
 *   { classId, acadTermId, bidWindow, predictedMedian, suggestedBidAmount,
 *     multiplierUsed, rationale }
 */
const bidRecommendationPropsSchema = z.object({
  classId: z.string(),
  acadTermId: z.string(),
  bidWindow: z
    .object({
      id: z.number(),
      round: z.string(),
      window: z.number(),
    })
    .optional(),
  predictedMedian: z.number(),
  suggestedBidAmount: z.number(),
  multiplierUsed: z
    .object({
      beatsPercentage: z.number(),
      multiplier: z.number(),
    })
    .nullable()
    .optional(),
  rationale: z.string().optional(),
});

export const widgetMetadata: WidgetMetadata = {
  description: "Recommended bid amount for a class",
  props: bidRecommendationPropsSchema,
};

// Inline design tokens derived from src/common/styles/shadcn.scss
const TOKENS = {
  light: {
    card: "oklch(0.99 0 0)",
    cardFg: "oklch(0.141 0.005 285.823)",
    mutedFg: "oklch(0.552 0.016 285.938)",
    border: "oklch(0.92 0.004 286.32)",
    primary: "oklch(0.48 0.2229 280.55)",
    primaryFg: "oklch(0.969 0.016 293.756)",
    radius: "0.75rem",
  },
  dark: {
    card: "oklch(0.21 0.006 285.885)",
    cardFg: "oklch(0.985 0 0)",
    mutedFg: "oklch(0.705 0.015 286.067)",
    border: "oklch(1 0 0 / 10%)",
    primary: "oklch(0.585 0.233 277.117)",
    primaryFg: "oklch(0.969 0.016 293.756)",
    radius: "0.75rem",
  },
} as const;

const Skeleton: React.FC<{ dark: boolean }> = ({ dark }) => {
  const c = dark ? TOKENS.dark : TOKENS.light;
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
      aria-label="Loading"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            height: 56,
            borderRadius: c.radius,
            background: dark
              ? "oklch(0.274 0.006 286.033)"
              : "oklch(0.967 0.001 286.375)",
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

const BidRecommendation: React.FC = () => {
  const { props, isPending, theme, callTool } = useWidget<
    z.infer<typeof bidRecommendationPropsSchema>
  >() as unknown as {
    props: z.infer<typeof bidRecommendationPropsSchema>;
    isPending: boolean;
    theme: string;
    callTool?: (
      name: string,
      input: Record<string, unknown>,
    ) => Promise<unknown>;
  };
  const dark = theme === "dark";
  const c = dark ? TOKENS.dark : TOKENS.light;
  if (isPending) return <Skeleton dark={dark} />;
  const hasBidWindow = Boolean(props.bidWindow);
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
      {/* Header: class + term/window badge */}
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
          {props.classId}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 9999,
            background: dark
              ? "oklch(0.488 0.243 264.376 / 15%)"
              : "oklch(0.546 0.245 262.881 / 12%)",
            color: dark
              ? "oklch(0.623 0.214 259.815)"
              : "oklch(0.488 0.243 264.376)",
            border: `1px solid ${c.border}`,
          }}
        >
          {hasBidWindow
            ? `Round ${props.bidWindow!.round} W${props.bidWindow!.window}`
            : props.acadTermId}
          {hasBidWindow && ` · ${props.acadTermId}`}
        </span>
      </div>
      {/* Hero: predicted vs suggested */}
      <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
        {props.predictedMedian !== undefined && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: c.mutedFg, fontWeight: 500 }}>
              Predicted median
            </div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>
              ${props.predictedMedian}
            </div>
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: c.mutedFg, fontWeight: 500 }}>
            Suggested bid
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: c.primary }}>
            ${props.suggestedBidAmount}
          </div>
        </div>
      </div>
      {props.multiplierUsed && (
        <span
          style={{
            display: "inline-block",
            marginTop: 8,
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 9999,
            background: c.card,
            color: c.primary,
            border: `1px solid ${c.primary}`,
          }}
        >
          ×{props.multiplierUsed.multiplier} — beats{" "}
          {props.multiplierUsed.beatsPercentage}%
        </span>
      )}
      {props.rationale && (
        <p
          style={{
            margin: "8px 0 0",
            fontSize: 12,
            color: c.mutedFg,
            lineHeight: 1.5,
          }}
        >
          {props.rationale}
        </p>
      )}
      {/* CTA requires a bidWindow: upsert-bid's schema needs bidWindowId. */}
      {callTool && props.bidWindow && (
        <button
          type="button"
          onClick={() =>
            void callTool("upsert-bid", {
              classId: props.classId,
              bidAmount: props.suggestedBidAmount,
              bidWindowId: props.bidWindow!.id,
            })
          }
          style={{
            marginTop: 12,
            width: "100%",
            padding: "8px 16px",
            borderRadius: 9999,
            border: "none",
            background: c.primary,
            color: c.primaryFg,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Set bid to ${props.suggestedBidAmount}
        </button>
      )}
    </div>
  );
};

export default BidRecommendation;
