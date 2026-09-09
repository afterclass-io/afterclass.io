import { useMemo, useState } from "react";
import type React from "react";
import type { ViewConfig } from "mcp-use/react";
import {
  useDynamicTool,
  useHostContext,
  useToolContext,
  useViewTheme,
} from "mcp-use/react";
import type { BidExplorerData } from "../../src/mcp/view-tools/schemas";
import { useCtaFeedback } from "../shared/use-cta-feedback";
import { TOKENS, Skeleton } from "../shared/tokens";
import { compareRounds } from "../shared/utils/round-order";
import { buildChartPoints } from "../shared/utils/chart-points";
import { shortTermLabel } from "../shared/utils/term-label";
import { ToggleButton } from "../shared/components/ToggleButton";
import { RangeRow } from "../shared/components/RangeRow";
import { HistoryTable } from "../shared/components/HistoryTable";
import { TrendChart } from "../shared/components/TrendChart";

// Re-exported so existing consumers of this view module (tests) keep working;
// the canonical implementation lives in `../shared/utils/term-label`.
export { shortTermLabel };

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

// NOTE: ROUND_ORDER/compareRounds, buildChartPoints/ChartPoint, shortTermLabel,
// estimateLabelWidth/clampLabelCenterX, TrendChart, HistoryTable, ToggleButton,
// RangeRow all live in `../shared/*` now (relative imports above) — do NOT
// reintroduce local copies here; the view bundle stays dependency-free via
// the shared modules.

const BidExplorerView: React.FC = () => {
  // Defensive: the host always provides context, but a missing context must
  // render the skeleton, never crash the view on destructure.
  const { status, toolOutput, error } =
    useToolContext<"explore-bid-options">() ?? {
      status: "pending" as const,
    };
  const theme = useViewTheme();
  // The slider's selected factor starts unset: toolOutput arrives
  // asynchronously in the real mcp-apps host (after ui/initialize) WITHOUT a
  // remount, so an initializer reading toolOutput would freeze the wrong
  // default. The default (70% factor, else middle) is resolved at render
  // time instead.
  const [factorIdx, setFactorIdx] = useState<number | null>(null);
  const [selectedRounds, setSelectedRounds] = useState<string[]>([]);
  const [selectedWindows, setSelectedWindows] = useState<string[]>([]);
  const { feedback, showFeedback } = useCtaFeedback();
  // upsert-bid is viewless — useDynamicTool carries the explicit contract.
  const upsertBid = useDynamicTool<{
    classId: string;
    bidAmount: number;
    bidWindowId: number;
    confirm: true;
  }>("upsert-bid");
  const { isAvailable } = useHostContext();

  const dark = theme === "dark";
  const c = dark ? TOKENS.dark : TOKENS.light;
  // `toolOutput` is {classId, history, prediction, safetyFactors} from the
  // tool's outputSchema. The tool adapter currently passes its schemas
  // `as never` (Task 9 candidate to tighten), so read defensively exactly
  // like the v1 view read `props`.
  const props = toolOutput as BidExplorerData | undefined;
  // Memoize so downstream useMemo deps stay referentially stable across
  // renders when toolOutput is absent (avoids a fresh [] each render).
  const history = useMemo(() => props?.history ?? [], [props?.history]);
  const prediction = props?.prediction ?? null;
  const safetyFactors = props?.safetyFactors ?? [];
  const classId = props?.classId ?? null;
  const isEmpty = history.length === 0 && !prediction;

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
  // Same additive model as the analytics card and the chat tools
  // (recommended = predicted + multiplier x uncertainty). The value is
  // clamped to the SMU BOSS floor, mirroring `clampBidFloor` in
  // `src/server/mcp/tools/bid-shared.ts` (MIN_BID = 10; inlined here so the
  // view bundle stays dependency-free).
  const suggested = prediction
    ? round2(
        Math.max(
          10,
          prediction.medianPredicted +
            multiplier * (prediction.medianUncertainty ?? 0),
        ),
      )
    : null;

  // Data-driven filters mirror `BidAnalyticsClient`: options come from the
  // history itself, with bidirectional round<->window availability and
  // auto-deselection of options that stop being valid. These hooks run
  // unconditionally (even for pending/error/empty states) to preserve hook
  // order; they simply compute over empty arrays when there is no history.
  const allPoints = useMemo(() => buildChartPoints(history), [history]);
  const { dataRounds, dataWindows, roundWindows, windowRounds } =
    useMemo(() => {
      const rounds = new Set<string>();
      const windows = new Set<string>();
      const rw = new Map<string, Set<number>>();
      const wr = new Map<number, Set<string>>();
      for (const h of history) {
        rounds.add(h.round);
        windows.add(String(h.window));
        if (!rw.has(h.round)) rw.set(h.round, new Set());
        rw.get(h.round)!.add(h.window);
        if (!wr.has(h.window)) wr.set(h.window, new Set());
        wr.get(h.window)!.add(h.round);
      }
      return {
        dataRounds: Array.from(rounds).sort(compareRounds),
        dataWindows: Array.from(windows).sort(
          (a, b) => parseInt(a, 10) - parseInt(b, 10),
        ),
        roundWindows: rw,
        windowRounds: wr,
      };
    }, [history]);
  const { availableRounds, availableWindows } = useMemo(() => {
    let availRounds: string[];
    if (selectedWindows.length > 0) {
      const set = new Set<string>();
      for (const w of selectedWindows)
        windowRounds.get(parseInt(w, 10))?.forEach((r) => set.add(r));
      availRounds = dataRounds.filter((r) => set.has(r));
    } else {
      availRounds = dataRounds;
    }
    let availWindows: string[];
    if (selectedRounds.length > 0) {
      const set = new Set<number>();
      for (const r of selectedRounds)
        roundWindows.get(r)?.forEach((w) => set.add(w));
      availWindows = dataWindows.filter((w) => set.has(parseInt(w, 10)));
    } else {
      availWindows = dataWindows;
    }
    return { availableRounds: availRounds, availableWindows: availWindows };
  }, [
    selectedRounds,
    selectedWindows,
    dataRounds,
    dataWindows,
    roundWindows,
    windowRounds,
  ]);
  const filteredPoints = useMemo(
    () =>
      allPoints.filter((p) => {
        if (selectedRounds.length > 0 && !selectedRounds.includes(p.round))
          return false;
        if (selectedWindows.length > 0 && !selectedWindows.includes(p.window))
          return false;
        return true;
      }),
    [allPoints, selectedRounds, selectedWindows],
  );
  const toggleRound = (round: string) => {
    const next = selectedRounds.includes(round)
      ? selectedRounds.filter((r) => r !== round)
      : [...selectedRounds, round];
    setSelectedRounds(next);
    // Deselecting the last round clears the round filter: leave the window
    // selection untouched instead of wiping it via an empty valid set.
    if (next.length === 0) return;
    const valid = new Set<number>();
    for (const r of next) roundWindows.get(r)?.forEach((w) => valid.add(w));
    setSelectedWindows((prev) =>
      prev.filter((w) => valid.has(parseInt(w, 10))),
    );
  };
  const toggleWindow = (window: string) => {
    const next = selectedWindows.includes(window)
      ? selectedWindows.filter((w) => w !== window)
      : [...selectedWindows, window];
    setSelectedWindows(next);
    // Same guard as toggleRound: clearing the window filter must not wipe
    // the round selection.
    if (next.length === 0) return;
    const valid = new Set<string>();
    for (const w of next)
      windowRounds.get(parseInt(w, 10))?.forEach((r) => valid.add(r));
    setSelectedRounds((prev) => prev.filter((r) => valid.has(r)));
  };
  const currentKey = prediction
    ? (allPoints.find(
        (p) =>
          p.round === prediction.bidWindow.round &&
          p.window === String(prediction.bidWindow.window),
      )?.key ?? null)
    : null;

  const max = Math.max(
    1,
    ...history.map((h) => h.median),
    ...(prediction ? [prediction.medianPredicted] : []),
  );

  // State returns AFTER every hook above: pending/error/empty must not
  // return before the useMemo block, or hook order changes when toolOutput
  // arrives after mount (pending -> ready without remount).
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
  if (isEmpty) {
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
              color: dark
                ? "oklch(0.623 0.214 259.815)"
                : "oklch(0.488 0.243 264.376)",
              border: `1px solid ${c.border}`,
            }}
          >
            {`Round ${prediction.bidWindow.round} W${prediction.bidWindow.window}`}
          </span>
        )}
      </div>
      {/* Historical trend chart */}
      {filteredPoints.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            Historical Bidding Trend
          </div>
          <TrendChart points={filteredPoints} currentKey={currentKey} c={c} />
        </div>
      )}
      {/* Round / window filters (data-driven, bidirectional) */}
      {dataRounds.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: c.mutedFg,
              marginBottom: 4,
            }}
          >
            Round
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {availableRounds.map((r) => (
              <ToggleButton
                key={r}
                label={r}
                pressed={selectedRounds.includes(r)}
                onClick={() => toggleRound(r)}
                c={c}
              />
            ))}
          </div>
        </div>
      )}
      {dataWindows.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: c.mutedFg,
              marginBottom: 4,
            }}
          >
            Window
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {availableWindows.map((w) => (
              <ToggleButton
                key={w}
                label={`W${w}`}
                pressed={selectedWindows.includes(w)}
                onClick={() => toggleWindow(w)}
                c={c}
              />
            ))}
          </div>
        </div>
      )}
      {/* Sortable history table */}
      {filteredPoints.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          <HistoryTable points={filteredPoints} c={c} />
        </div>
      ) : (
        <div
          style={{
            fontSize: 12,
            color: c.mutedFg,
            textAlign: "center",
            marginTop: 12,
          }}
        >
          No bid data available for the selected filters.
        </div>
      )}
      {/* History bands */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          marginTop: 12,
        }}
      >
        {prediction && (
          <div>
            <div
              style={{
                fontSize: 11,
                color: c.mutedFg,
                fontWeight: 500,
                marginBottom: 2,
              }}
            >
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
      {/* Safety-multiplier slider.
          Formula display replaces the deleted bid-recommendation
          view: the rationale wording mirrors `recommend.ts`
          ("Predicted X + multiplier Y x uncertainty Z (beats W%)"). */}
      {prediction &&
        safetyFactors.length > 0 &&
        factor &&
        suggested !== null && (
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
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: c.primary,
                marginTop: 4,
              }}
            >
              ${suggested}
            </div>
            <div style={{ fontSize: 12, color: c.mutedFg, marginTop: 4 }}>
              {`Predicted ${prediction.medianPredicted} + multiplier ${factor.multiplier} x uncertainty ${prediction.medianUncertainty ?? 0} (beats ${factor.beatsPercentage}%)`}
            </div>
          </div>
        )}
      {/* CTA */}
      {isAvailable && classId && prediction && suggested !== null && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: c.mutedFg, marginBottom: 6 }}>
            Bids use real SMU BOSS e-credits and are binding once the window
            closes. Confirm the amount before saving — you can change it again
            before the window closes.
          </div>
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
                .callTool({
                  classId: cid,
                  bidAmount: suggested,
                  bidWindowId,
                  confirm: true,
                })
                .then(() => showFeedback("saved"))
                .catch(() => showFeedback("error"));
            }}
            style={{
              width: "100%",
              padding: "8px 16px",
              borderRadius: 9999,
              border: "none",
              background:
                feedback === "error" ? "oklch(0.6 0.2 20)" : c.primary,
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
                : `Confirm: set bid to $${suggested}`}
          </button>
        </div>
      )}
    </div>
  );
};

export default BidExplorerView;
