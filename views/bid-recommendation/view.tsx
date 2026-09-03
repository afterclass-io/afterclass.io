import type React from "react";
import type { ViewConfig } from "mcp-use/react";
import {
  useDynamicTool,
  useHostContext,
  useToolContext,
  useViewTheme,
} from "mcp-use/react";
import type { BidRecommendationData } from "../../src/mcp/view-tools/schemas";
import { useCtaFeedback } from "../shared/use-cta-feedback";
import { TOKENS, Skeleton } from "../shared/tokens";

/**
 * MCP App View (mcp-use v2) for the `recommend-bid-amount` tool. Must stay
 * dependency-free: no `@/server/*`, no `next/*`.
 *
 * The hero (predicted vs suggested), multiplier badge and rationale are
 * copied verbatim from the v1 `resources/bid-recommendation/widget.tsx`;
 * only the data channels changed:
 *
 *   v1 useWidget().props            -> v2 useToolContext().toolOutput
 *   v1 useWidget().isPending        -> v2 status === "pending"
 *   v1 useWidget().theme            -> v2 useViewTheme()
 *   v1 useWidget().callTool         -> v2 useDynamicTool("upsert-bid")
 *   v1 inline TOKENS/Skeleton       -> shared views/shared/tokens (identical values)
 *   v1 widgetMetadata export        -> v2 viewConfig export
 *
 * The v1 "Set bid to $X" CTA is restored for v1 parity (fix round 1):
 * recommend-bid-amount is readOnly, but a View may still initiate a write
 * via a CTA — that is the sanctioned v2 pattern (viewless write tools are
 * callable from Views). upsert-bid is viewless (not an exported ToolRef),
 * so useDynamicTool carries the explicit contract, mirroring bid-explorer.
 */

export const viewConfig = {
  autoResize: true,
  displayModes: ["inline", "fullscreen", "pip"],
} satisfies ViewConfig;

const BidRecommendationView: React.FC = () => {
  const { status, toolOutput, error } = useToolContext<"recommend-bid-amount">();
  const theme = useViewTheme();
  const { feedback, showFeedback } = useCtaFeedback();
  // upsert-bid is viewless — useDynamicTool carries the explicit contract.
  const upsertBid = useDynamicTool<{
    classId: string;
    bidAmount: number;
    bidWindowId: number;
  }>("upsert-bid");
  const { isAvailable } = useHostContext();
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
  // `toolOutput` is the recommendation shape from the tool's outputSchema.
  // The tool adapter currently passes its schemas `as never` (Task 9
  // candidate to tighten), so read defensively exactly like the v1 widget
  // read `props`.
  const props = toolOutput as BidRecommendationData | undefined;
  if (!props) return null;
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
        width: "100%",
        maxWidth: "100%",
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
      {/* CTA (v1 parity): requires a bidWindow — upsert-bid's schema needs
          bidWindowId. v2: tool errors reject (ToolError) instead of resolving
          isError:true, so "Failed to save" lives in catch. */}
      {isAvailable && props.bidWindow && (
        <button
          type="button"
          aria-live="polite"
          onClick={() => {
            upsertBid
              .callTool({
                classId: props.classId,
                bidAmount: props.suggestedBidAmount,
                bidWindowId: props.bidWindow!.id,
              })
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
            ? "Saved \u2713"
            : feedback === "error"
              ? "Failed to save"
              : `Set bid to $${props.suggestedBidAmount}`}
        </button>
      )}
    </div>
  );
};

export default BidRecommendationView;
