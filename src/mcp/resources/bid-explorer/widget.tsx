import { useState } from "react";
import type { WidgetMetadata } from "mcp-use/react";
import { z } from "zod";
import { useCtaFeedback } from "../shared/use-cta-feedback";
import { useWidget } from "../shared/use-widget";

import { TOKENS, Skeleton } from "../shared/tokens";

/**
 * Browser-iframe widget (MCP Apps) for `explore-bid-options`.
 * Must stay dependency-free: no `@/server/*`, no `next/*`.
 *
 * Props mirror the exact JSON the tool emits via `jsonText(...)` in
 * `src/server/mcp/tools/read/explore-bid-options.ts`:
 *   { classId, history: HistoryPoint[], prediction: Prediction | null,
 *     safetyFactors: SafetyFactorEntry[] }
 */
const historyPointSchema = z.object({
  acadTermId: z.string(),
  round: z.string(),
  window: z.number(),
  min: z.number(),
  median: z.number(),
  vacancy: z.number().nullable(),
});

const predictionSchema = z.object({
  medianPredicted: z.number(),
  minPredicted: z.number().nullable(),
  bidWindow: z.object({
    id: z.number(),
    round: z.string(),
    window: z.number(),
  }),
});

const bidExplorerPropsSchema = z.object({
  classId: z.string().nullable(),
  history: z.array(historyPointSchema),
  prediction: predictionSchema.nullable(),
  safetyFactors: z.array(
    z.object({
      beatsPercentage: z.number(),
      multiplier: z.number(),
    }),
  ),
});

export const widgetMetadata: WidgetMetadata = {
  description: "Explore historical bid ranges and pick a bid amount",
  props: bidExplorerPropsSchema,
};

type Props = z.infer<typeof bidExplorerPropsSchema>;

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

const BidExplorer: React.FC = () => {
  const { props, isPending, theme, callTool, isAvailable } = useWidget<Props>() as unknown as {
    props: Props;
    isPending: boolean;
    theme: string;
    isAvailable: boolean;
    callTool?: (name: string, input: Record<string, unknown>) => Promise<unknown>;
  };
  // The slider's selected factor starts unset: props arrive asynchronously in
  // the real mcp-apps host (after ui/initialize) WITHOUT a remount, so an
  // initializer reading `props` would freeze the wrong default. The default
  // (70% factor, else middle) is resolved at render time instead.
  const [factorIdx, setFactorIdx] = useState<number | null>(null);
  const { feedback, showFeedback } = useCtaFeedback();

  const dark = theme === "dark";
  const c = dark ? TOKENS.dark : TOKENS.light;
  if (isPending) return <Skeleton dark={dark} />;

  const { history, prediction, safetyFactors } = props;
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
          maxWidth: 480,
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
        maxWidth: 480,
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
          {props.classId ?? "Bid explorer"}
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
      {isAvailable && callTool && props.classId && prediction && suggested !== null && (
        <button
          type="button"
          aria-live="polite"
          onClick={() =>
            callTool("upsert-bid", {
              classId: props.classId,
              bidAmount: suggested,
              bidWindowId: prediction.bidWindow.id,
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
            ? "Saved \u2713"
            : feedback === "error"
              ? "Failed to save"
              : `Set bid to $${suggested}`}
        </button>
      )}
    </div>
  );
};

export default BidExplorer;
