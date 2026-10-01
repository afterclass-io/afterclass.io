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
import { format2dp } from "../shared/format";
import { compareRounds } from "../shared/utils/round-order";
import { buildChartPoints } from "../shared/utils/chart-points";
import { shortTermLabel } from "../shared/utils/term-label";
import { ToggleButton } from "../shared/components/ToggleButton";
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

// Selectable success-rate ticks (mirrors the website SuccessRateSlider
// marks: 50/60/70/80/90/95; the chat tools + analytics default to 70%).
const SUCCESS_RATE_TICKS = [50, 60, 70, 80, 90, 95] as const;

const confidenceLabel = (score: number): string =>
  score < 0.3
    ? "Very Low"
    : score < 0.5
      ? "Low"
      : score < 0.7
        ? "Medium"
        : score < 0.9
          ? "High"
          : "Very High";

// NOTE: ROUND_ORDER/compareRounds, buildChartPoints/ChartPoint, shortTermLabel,
// estimateLabelWidth/clampLabelCenterX, TrendChart, HistoryTable, ToggleButton
// all live in `../shared/*` now (relative imports above) — do NOT
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
  // `toolOutput` is {classId, courseCode, section, history, prediction,
  // safetyFactors, minSafetyFactors} from the tool's outputSchema. The tool
  // adapter passes its schemas `as never`, so read defensively (every field
  // optional with a skeleton fallback).
  const props = toolOutput as BidExplorerData | undefined;
  // Memoize so downstream useMemo deps stay referentially stable across
  // renders when toolOutput is absent (avoids a fresh [] each render).
  const history = useMemo(() => props?.history ?? [], [props?.history]);
  const prediction = props?.prediction ?? null;
  const safetyFactors = useMemo(
    () => props?.safetyFactors ?? [],
    [props?.safetyFactors],
  );
  const minSafetyFactors = useMemo(
    () => props?.minSafetyFactors ?? [],
    [props?.minSafetyFactors],
  );
  const classId = props?.classId ?? null;
  const courseCode = props?.courseCode ?? null;
  const section = props?.section ?? null;
  const isEmpty = history.length === 0 && !prediction;

  // Selected success rate (default 70%, mirroring the website
  // SuccessRateSlider + BidPredictionCard). The toolOutput arrives
  // asynchronously in the real mcp-apps host (after ui/initialize) WITHOUT a
  // remount, so factorIdx stays unset until the user moves the slider; the
  // resolved beatsPercentage defaults to 70% when available.
  const defaultBeats = () => {
    if (safetyFactors.some((f) => f.beatsPercentage === 70)) return 70;
    return safetyFactors[0]?.beatsPercentage ?? 70;
  };
  const defaultIdx = () => {
    const i = safetyFactors.findIndex((f) => f.beatsPercentage === 70);
    return i >= 0 ? i : Math.floor(Math.max(0, safetyFactors.length - 1) / 2);
  };
  const multiplierAt = (
    factors: Array<{ beatsPercentage: number; multiplier: number }>,
    beats: number,
  ): number =>
    factors.find((f) => f.beatsPercentage === beats)?.multiplier ?? 1;
  // Resolved beats% from the slider index (index into the safety-factor
  // ladder, whose entries carry the beats percentages).
  const resolvedBeats =
    factorIdx !== null && safetyFactors[factorIdx]
      ? safetyFactors[factorIdx].beatsPercentage
      : defaultBeats();
  const beatsPercentage = resolvedBeats;
  const idx = Math.min(
    factorIdx ?? defaultIdx(),
    Math.max(0, safetyFactors.length - 1),
  );
  const factor = safetyFactors[idx];
  // No safety factors for this term -> multiplier 1.0, like recommend.ts
  // (`factor?.multiplier ?? 1`); the CTA must still be offered.
  const medianMultiplier =
    factor?.multiplier ?? multiplierAt(safetyFactors, beatsPercentage);
  const minMultiplier = multiplierAt(
    minSafetyFactors.length > 0 ? minSafetyFactors : safetyFactors,
    beatsPercentage,
  );
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
            medianMultiplier * (prediction.medianUncertainty ?? 0),
        ),
      )
    : null;
  // Recommended range for the Bid Prediction header:
  // min = minPredicted + minMultiplier x minUncertainty,
  // median = medianPredicted + medianMultiplier x medianUncertainty.
  const recommendedMin =
    prediction && prediction.minPredicted !== null
      ? round2(
          prediction.minPredicted +
            minMultiplier * (prediction.minUncertainty ?? 0),
        )
      : null;
  const recommendedMedian = suggested;
  const hasBidsProbability = prediction?.clfHasBidsProbability ?? null;
  const confidenceScore = prediction?.clfConfidenceScore ?? null;

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
      for (const p of allPoints) {
        rounds.add(p.round);
        windows.add(p.window);
        const w = parseInt(p.window, 10) || 0;
        if (!rw.has(p.round)) rw.set(p.round, new Set());
        rw.get(p.round)!.add(w);
        if (!wr.has(w)) wr.set(w, new Set());
        wr.get(w)!.add(p.round);
      }
      return {
        dataRounds: Array.from(rounds).sort(compareRounds),
        dataWindows: Array.from(windows).sort(
          (a, b) => parseInt(a, 10) - parseInt(b, 10),
        ),
        roundWindows: rw,
        windowRounds: wr,
      };
    }, [allPoints]);
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
          p.acadTermId === prediction.bidWindow.acadTermId &&
          p.round === prediction.bidWindow.round &&
          p.window === String(prediction.bidWindow.window),
      )?.key ?? null)
    : null;
  // Current academic term for the now marker (tool-output field,
  // `caller.acadTerms.current()` at the server). TrendChart renders the
  // marker only when this term is visible in the filtered points.
  const currentAcadTermId = props?.currentAcadTermId ?? null;

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
      {/* Bid Prediction header (BidPredictionCard parity) */}
      {prediction && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 20, fontWeight: 700 }}>
              Bid Prediction
            </span>
            {recommendedMin !== null && recommendedMedian !== null && (
              <span
                style={{
                  color: c.primary,
                  fontWeight: 700,
                  fontFamily: "var(--font-geist-mono, ui-monospace)",
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 18,
                }}
              >
                e${format2dp(recommendedMin)} - e$
                {format2dp(recommendedMedian)}
              </span>
            )}
          </div>
          <div style={{ marginTop: 4, fontSize: 13 }}>
            {(courseCode ?? classId ?? "Bid explorer") +
              (section ? ` ${section}` : "") +
              (prediction ? ` · ${prediction.bidWindow.acadTermId}` : "")}
          </div>
          <div style={{ fontSize: 12, color: c.mutedFg, marginTop: 2 }}>
            {`Round ${prediction.bidWindow.round} · Window ${prediction.bidWindow.window}`}
          </div>
          <div
            style={{
              fontSize: 12,
              fontStyle: "italic",
              color: c.mutedFg,
              marginTop: 4,
            }}
          >
            ⓘ Note: AfterClass is not liable for any unsuccessful bids. Use at
            your own risk!
          </div>
        </div>
      )}
      {!prediction && (
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
        </div>
      )}
      {/* Odds + Confidence metrics (BidPredictionCard parity) */}
      {prediction &&
        hasBidsProbability !== null &&
        confidenceScore !== null && (
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
              }}
            >
              <span style={{ width: 180, flexShrink: 0 }}>
                Odds of having other bids
              </span>
              <div
                role="progressbar"
                aria-label="Odds of having other bids"
                aria-valuenow={Number(
                  (hasBidsProbability * 100).toFixed(2),
                )}
                aria-valuemin={0}
                aria-valuemax={100}
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 9999,
                  background: c.border,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${hasBidsProbability * 100}%`,
                    height: "100%",
                    borderRadius: 9999,
                    background: c.primary,
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: "var(--font-geist-mono, ui-monospace)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {(hasBidsProbability * 100).toFixed(2)}%
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 9999,
                  background:
                    hasBidsProbability >= 0.5
                      ? "oklch(0.7 0.2 150 / 15%)"
                      : "oklch(0.6 0.2 20 / 12%)",
                  color:
                    hasBidsProbability >= 0.5
                      ? "oklch(0.45 0.2 150)"
                      : "oklch(0.55 0.22 20)",
                  border: `1px solid ${c.border}`,
                }}
              >
                {hasBidsProbability >= 0.5 ? "Likely" : "Unlikely"}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                marginTop: 8,
              }}
            >
              <span style={{ width: 180, flexShrink: 0 }}>
                Confidence Level
              </span>
              <div
                role="progressbar"
                aria-label="Confidence Level"
                aria-valuenow={Number((confidenceScore * 100).toFixed(2))}
                aria-valuemin={0}
                aria-valuemax={100}
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 9999,
                  background: c.border,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${confidenceScore * 100}%`,
                    height: "100%",
                    borderRadius: 9999,
                    background: c.primary,
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: "var(--font-geist-mono, ui-monospace)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {(confidenceScore * 100).toFixed(2)}%
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 9999,
                  background:
                    confidenceScore >= 0.5
                      ? "oklch(0.7 0.2 150 / 15%)"
                      : "oklch(0.6 0.2 20 / 12%)",
                  color:
                    confidenceScore >= 0.5
                      ? "oklch(0.45 0.2 150)"
                      : "oklch(0.55 0.22 20)",
                  border: `1px solid ${c.border}`,
                }}
              >
                {confidenceLabel(confidenceScore)}
              </span>
            </div>
          </div>
        )}
      {/* Historical trend chart (below the prediction section when history is present) */}
      {history.length > 0 && filteredPoints.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            Historical Bidding Trend
          </div>
          <TrendChart
            points={filteredPoints}
            currentKey={currentKey}
            currentAcadTermId={currentAcadTermId}
            c={c}
          />
        </div>
      )}
      {/* Round / window filters (below the prediction section when history is present) */}
      {history.length > 0 && dataRounds.length > 0 && (
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
      {history.length > 0 && dataWindows.length > 0 && (
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
                label={String(parseInt(w, 10) || w)}
                pressed={selectedWindows.includes(w)}
                onClick={() => toggleWindow(w)}
                c={c}
              />
            ))}
          </div>
        </div>
      )}
      {/* Sortable history table (below the prediction section when history is present) */}
      {history.length > 0 &&
        (filteredPoints.length > 0 ? (
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
        ))}
      {/* Success-rate slider driving both formula rows (BidPredictionCard parity).
          Ticks mirror the website SuccessRateSlider marks: 50/60/70/80/90/95
          (default 70%). The selected beatsPercentage resolves minMultiplier
          from minSafetyFactors and medianMultiplier from safetyFactors. */}
      {prediction &&
        safetyFactors.length > 0 &&
        factor &&
        suggested !== null && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>
              Estimated success rate
            </div>
            <input
              type="range"
              aria-label="Estimated success rate"
              min={SUCCESS_RATE_TICKS[0]}
              max={SUCCESS_RATE_TICKS[SUCCESS_RATE_TICKS.length - 1]}
              step={5}
              value={beatsPercentage}
              onChange={(e) => {
                const next = Number(e.target.value);
                const ladderIdx = safetyFactors.findIndex(
                  (f) => f.beatsPercentage === next,
                );
                setFactorIdx(
                  ladderIdx >= 0 ? ladderIdx : defaultIdx(),
                );
              }}
              style={{ width: "100%", accentColor: c.primary }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: c.mutedFg,
              }}
            >
              {SUCCESS_RATE_TICKS.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-label={`Set success rate to ${t}%`}
                  aria-pressed={beatsPercentage === t}
                  onClick={() => {
                    const ladderIdx = safetyFactors.findIndex(
                      (f) => f.beatsPercentage === t,
                    );
                    setFactorIdx(
                      ladderIdx >= 0 ? ladderIdx : defaultIdx(),
                    );
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: 11,
                    fontWeight: beatsPercentage === t ? 700 : 400,
                    color:
                      beatsPercentage === t ? c.primary : c.mutedFg,
                  }}
                >
                  {t}%
                </button>
              ))}
            </div>
            {/* Legacy slider hooks (hidden): the old index-based contract
                ("Safety multiplier" + beats label + hero) stays mounted so
                existing consumers keep working while the new ticks UI is
                the visible control. */}
            <input
              type="range"
              aria-label="Safety multiplier"
              min={0}
              max={safetyFactors.length - 1}
              step={1}
              value={idx}
              onChange={(e) => setFactorIdx(Number(e.target.value))}
              style={{
                position: "absolute",
                width: 1,
                height: 1,
                overflow: "hidden",
                clip: "rect(0,0,0,0)",
              }}
            />
          </div>
        )}
      {/* Formula breakdown (BidPredictionCard parity, 2dp throughout):
          Min: recommendedMin = minPredicted + (minMultiplier x minUncertainty);
          Median: recommendedMedian = medianPredicted + (medianMultiplier x
          medianUncertainty). Each number carries its sub-label below. */}
      {prediction && suggested !== null && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Formula</div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Min</div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                gap: 8,
                fontSize: 18,
                fontWeight: 700,
                marginTop: 4,
              }}
            >
              <span style={{ textAlign: "center" }}>
                <span
                  style={{
                    fontFamily: "var(--font-geist-mono, ui-monospace)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {recommendedMin !== null
                    ? format2dp(recommendedMin)
                    : "—"}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 400,
                    color: c.mutedFg,
                  }}
                >
                  recommended
                </span>
              </span>
              <span style={{ color: c.mutedFg }}>=</span>
              <span style={{ textAlign: "center" }}>
                <span
                  style={{
                    fontFamily: "var(--font-geist-mono, ui-monospace)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {prediction.minPredicted !== null
                    ? format2dp(prediction.minPredicted)
                    : "—"}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 400,
                    color: c.mutedFg,
                  }}
                >
                  predicted
                </span>
              </span>
              <span style={{ color: c.mutedFg }}>+</span>
              <span style={{ color: c.mutedFg }}>(</span>
              <span style={{ textAlign: "center" }}>
                <span
                  style={{
                    fontFamily: "var(--font-geist-mono, ui-monospace)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {format2dp(minMultiplier)}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 400,
                    color: c.mutedFg,
                  }}
                >
                  multiplier
                </span>
              </span>
              <span style={{ color: c.mutedFg }}>*</span>
              <span style={{ textAlign: "center" }}>
                <span
                  style={{
                    fontFamily: "var(--font-geist-mono, ui-monospace)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {format2dp(prediction.minUncertainty ?? 0)}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 400,
                    color: c.mutedFg,
                  }}
                >
                  uncertainty
                </span>
              </span>
              <span style={{ color: c.mutedFg }}>)</span>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Median</div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                gap: 8,
                fontSize: 18,
                fontWeight: 700,
                marginTop: 4,
              }}
            >
              <span style={{ textAlign: "center" }}>
                <span
                  style={{
                    fontFamily: "var(--font-geist-mono, ui-monospace)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {recommendedMedian !== null
                    ? format2dp(recommendedMedian)
                    : "—"}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 400,
                    color: c.mutedFg,
                  }}
                >
                  recommended
                </span>
              </span>
              <span style={{ color: c.mutedFg }}>=</span>
              <span style={{ textAlign: "center" }}>
                <span
                  style={{
                    fontFamily: "var(--font-geist-mono, ui-monospace)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {format2dp(prediction.medianPredicted)}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 400,
                    color: c.mutedFg,
                  }}
                >
                  predicted
                </span>
              </span>
              <span style={{ color: c.mutedFg }}>+</span>
              <span style={{ color: c.mutedFg }}>(</span>
              <span style={{ textAlign: "center" }}>
                <span
                  style={{
                    fontFamily: "var(--font-geist-mono, ui-monospace)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {format2dp(medianMultiplier)}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 400,
                    color: c.mutedFg,
                  }}
                >
                  multiplier
                </span>
              </span>
              <span style={{ color: c.mutedFg }}>*</span>
              <span style={{ textAlign: "center" }}>
                <span
                  style={{
                    fontFamily: "var(--font-geist-mono, ui-monospace)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {format2dp(prediction.medianUncertainty ?? 0)}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 400,
                    color: c.mutedFg,
                  }}
                >
                  uncertainty
                </span>
              </span>
              <span style={{ color: c.mutedFg }}>)</span>
            </div>
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
                : `Confirm: set bid to $${format2dp(suggested)}`}
          </button>
        </div>
      )}
    </div>
  );
};

export default BidExplorerView;
