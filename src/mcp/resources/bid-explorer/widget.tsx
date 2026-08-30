import { useState } from "react";
import { useWidget, type WidgetMetadata } from "mcp-use/react";
import { z } from "zod";

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
  c: (typeof TOKENS)["light"];
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
  const { props, isPending, theme, callTool } = useWidget<Props>() as unknown as {
    props: Props;
    isPending: boolean;
    theme: string;
    callTool?: (name: string, input: Record<string, unknown>) => Promise<unknown>;
  };
  // Hook order: useState must run before the isPending early return; props
  // can be undefined while pending, so tolerate that here.
  const defaultIdx = (p: Props | undefined) => {
    const factors = p?.safetyFactors ?? [];
    const i = factors.findIndex((f) => f.beatsPercentage === 70);
    return i >= 0 ? i : Math.floor(Math.max(0, factors.length - 1) / 2);
  };
  const [factorIdx, setFactorIdx] = useState(() => defaultIdx(props));

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

  const idx = Math.min(factorIdx, Math.max(0, safetyFactors.length - 1));
  const factor = safetyFactors[idx];
  const suggested =
    prediction && factor ? round2(prediction.medianPredicted * factor.multiplier) : null;

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
      {callTool && props.classId && prediction && suggested !== null && (
        <button
          type="button"
          onClick={() =>
            void callTool("upsert-bid", {
              classId: props.classId,
              bidAmount: suggested,
              bidWindowId: prediction.bidWindow.id,
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
          Set bid to ${suggested}
        </button>
      )}
    </div>
  );
};

export default BidExplorer;
