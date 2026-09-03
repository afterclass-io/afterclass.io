import { useState } from "react";
import type React from "react";
import type { ViewConfig } from "mcp-use/react";
import { useDynamicTool, useHostContext, useToolContext, useViewTheme } from "mcp-use/react";
import type { BidExplorerData } from "../../src/mcp/view-tools/schemas";
import { useCtaFeedback } from "../shared/use-cta-feedback";
import { TOKENS, Skeleton } from "../shared/tokens";

/**
 * MCP App View (mcp-use v2) for the `explore-bid-options` tool. Must stay
 * dependency-free: no `@/server/*`, no `next/*`.
 *
 * The range bands, safety-multiplier slider and tokens are copied verbatim
 * from the v1 `resources/bid-explorer/widget.tsx`; only the data channels
 * changed:
 *
 *   v1 useWidget().props            -> v2 useToolContext().toolOutput
 *   v1 useWidget().isPending        -> v2 status === "pending"
 *   v1 useWidget().theme            -> v2 useViewTheme()
 *   v1 useWidget().callTool         -> v2 useDynamicTool("upsert-bid")
 *   v1 widgetMetadata export        -> v2 viewConfig export
 *
 * upsert-bid is viewless (not an exported ToolRef), so the v2 escape hatch is
 * useDynamicTool with an explicit contract.
 */

export const viewConfig = {
  autoResize: true,
  displayModes: ["inline", "fullscreen", "pip"],
} satisfies ViewConfig;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** One labelled track with a min–median range band and a median tick. */
const RangeRow: React.FC<{
  label: string;
  min: number;
  median: number;
  max: number;
  dashed?: boolean;
  c: (typeof TOKENS)[keyof typeof TOKENS];
}> = ({ label, min, median, max, dashed, c }) => {
  const pct = (v: number) => Math.min(100, (v / max) * 100);
  const left = pct(min);
  const width = Math.max(1, pct(median) - left);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          width: 110,
          flexShrink: 0,
          fontSize: 12,
          color: c.mutedFg,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 18,
          position: "relative",
          background: c.border,
          borderRadius: 4,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: `${left}%`,
            width: `${width}%`,
            top: 0,
            bottom: 0,
            borderRadius: 4,
            background: dashed ? "transparent" : `${c.primary}4D`, // 30% opacity
            border: dashed ? `2px dashed ${c.primary}` : "none",
            boxSizing: "border-box",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${pct(median)}%`,
            top: 0,
            bottom: 0,
            width: 2,
            background: c.primary,
          }}
        />
      </div>
      <span
        style={{
          flexShrink: 0,
          fontFamily: "var(--font-geist-mono, ui-monospace)",
          fontSize: 12,
          textAlign: "right",
        }}
      >
        ${min}–${median}
      </span>
    </div>
  );
};

const BidExplorerView: React.FC = () => {
  const { status, toolOutput, error } = useToolContext<"explore-bid-options">();
  const theme = useViewTheme();
  // The slider's selected factor starts unset: toolOutput arrives
  // asynchronously in the real mcp-apps host (after ui/initialize) WITHOUT a
  // remount, so an initializer reading toolOutput would freeze the wrong
  // default. The default (70% factor, else middle) is resolved at render
  // time instead.
  const [factorIdx, setFactorIdx] = useState<number | null>(null);
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
  // `toolOutput` is {classId, history, prediction, safetyFactors} from the
  // tool's outputSchema. The tool adapter currently passes its schemas
  // `as never` (Task 9 candidate to tighten), so read defensively exactly
  // like the v1 widget read `props`.
  const props = toolOutput as BidExplorerData | undefined;
  const history = props?.history ?? [];
  const prediction = props?.prediction ?? null;
  const safetyFactors = props?.safetyFactors ?? [];
  const classId = props?.classId ?? null;

  if (history.length === 0 && !prediction) {
    return (
      <div
        style={{
          fontFamily: "var(--font-inter, ui-sans-serif, system-ui)",
          color: c.mutedFg,
          background: c.card,
          border: `1px solid ${c.border}`,
          borderRadius: c.radius,
          padding: 16,
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        No bid history for this combination.
      </div>
    );
  }

  const defaultIdx = () => {
    const i = safetyFactors.findIndex((f) => f.beatsPercentage === 70);
    return i >= 0 ? i : Math.floor(Math.max(0, safetyFactors.length - 1) / 2);
  };
  const idx = Math.min(
    factorIdx ?? defaultIdx(),
    Math.max(0, safetyFactors.length - 1),
  );
  const factor = safetyFactors[idx];
  // No safety factors for this term -> multiplier 1.0, like recommend.ts
  // (`factor?.multiplier ?? 1`); the CTA must still be offered.
  const multiplier = factor?.multiplier ?? 1;
  const suggested = prediction
    ? round2(prediction.medianPredicted * multiplier)
    : null;

  const max = Math.max(
    1,
    ...history.map((h) => h.median),
    ...(prediction ? [prediction.medianPredicted] : []),
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
        width: "100%",
        maxWidth: "100%",
      }}
    >
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span
          style={{
            fontFamily: "var(--font-geist-mono, ui-monospace)",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          {classId ?? "Bid explorer"}
        </span>
        {prediction && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 9999,
              background: dark
                ? "oklch(0.488 0.243 264.376 / 15%)"
                : "oklch(0.546 0.245 262.881 / 12%)",
              color: dark ? "oklch(0.623 0.214 259.815)" : "oklch(0.488 0.243 264.376)",
              border: `1px solid ${c.border}`,
            }}
          >
            {`Round ${prediction.bidWindow.round} W${prediction.bidWindow.window}`}
          </span>
        )}
      </div>
      {/* History bands */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
        {history.map((h) => (
          <RangeRow
            key={`${h.acadTermId}-${h.round}-${h.window}`}
            label={`${h.acadTermId} R${h.round}`}
            min={h.min}
            median={h.median}
            max={max}
            c={c}
          />
        ))}
        {prediction && (
          <div>
            <div style={{ fontSize: 11, color: c.mutedFg, fontWeight: 500, marginBottom: 2 }}>
              Predicted · median ${prediction.medianPredicted}
            </div>
            <RangeRow
              label="Predicted"
              min={prediction.minPredicted ?? prediction.medianPredicted}
              median={prediction.medianPredicted}
              max={max}
              dashed
              c={c}
            />
          </div>
        )}
      </div>
      {/* Safety-multiplier slider */}
      {prediction && safetyFactors.length > 0 && factor && suggested !== null && (
        <div style={{ marginTop: 16 }}>
          <input
            type="range"
            aria-label="Safety multiplier"
            min={0}
            max={safetyFactors.length - 1}
            step={1}
            value={idx}
            onChange={(e) => setFactorIdx(Number(e.target.value))}
            style={{ width: "100%", accentColor: c.primary }}
          />
          <div style={{ fontSize: 12, color: c.mutedFg, marginTop: 4 }}>
            beats {factor.beatsPercentage}% of bids × {factor.multiplier}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: c.primary, marginTop: 4 }}>
            ${suggested}
          </div>
        </div>
      )}
      {/* CTA */}
      {isAvailable && classId && prediction && suggested !== null && (
        <button
          type="button"
          aria-live="polite"
          onClick={() => {
            // classId truthy above — narrow to string for the call contract.
            const cid: string = classId;
            const bidWindowId = prediction.bidWindow.id;
            // v2: tool errors reject (ToolError) instead of resolving
            // isError:true, so "Failed to save" moves to catch.
            upsertBid
              .callTool({ classId: cid, bidAmount: suggested, bidWindowId })
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
              : `Set bid to $${suggested}`}
        </button>
      )}
    </div>
  );
};

export default BidExplorerView;
