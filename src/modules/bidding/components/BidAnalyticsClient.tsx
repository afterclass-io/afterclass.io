"use client";

import { useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/card";
import { BidChart, sortChartData } from "@/modules/bidding/components/BidChart";
import { BidTable } from "@/modules/bidding/components/BidTable";
import { TagToggleGroup } from "@/common/components/tag-toggle-group";
import { DisclosureDisclaimer } from "@/modules/bidding/components/DisclosureDisclaimer";
import { compareRounds } from "@/modules/bidding/utils/round-order";

interface BidResultRow {
  bidWindow: {
    acadTermId: string;
    round: string;
    window: number;
  };
  class: {
    section?: string;
    professor: { name: string } | null;
  };
  beforeProcessVacancy: number;
  afterProcessVacancy: number | null;
  median: number | null;
  min: number | null;
  classId: string;
  bidWindowId: number;
}

interface BidAnalyticsClientProps {
  allBidResults: BidResultRow[];
  courseCode: string;
  section: string;
  /** Full bidWindow key for the current active window, e.g. "AY202627T1/1A/2" */
  currentWindowBidWindow?: string;
  /** Initial filter state from URL params */
  initialRounds?: string[];
  initialWindows?: string[];
}

/**
 * Extract the set of rounds and windows that actually exist in the data.
 * This ensures filters are always data-driven — no "dead" filter options.
 */
function deriveAvailableFromData(results: BidResultRow[]) {
  const rounds = new Set<string>();
  const windows = new Set<string>();

  for (const r of results) {
    rounds.add(r.bidWindow.round);
    windows.add(r.bidWindow.window.toString());
  }

  return {
    dataRounds: Array.from(rounds).sort(compareRounds),
    dataWindows: Array.from(windows).sort(
      (a, b) => parseInt(a) - parseInt(b),
    ),
  };
}

export const BidAnalyticsClient = ({
  allBidResults,
  courseCode,
  section,
  currentWindowBidWindow,
  initialRounds = [],
  initialWindows = [],
}: BidAnalyticsClientProps) => {
  const [selectedRounds, setSelectedRounds] = useState<string[]>(initialRounds);
  const [selectedWindows, setSelectedWindows] = useState<string[]>(initialWindows);

  // Sync filter state to URL via replaceState (shareable, no page reload)
  const syncUrl = useCallback(
    (rounds: string[], windows: string[]) => {
      const params = new URLSearchParams(window.location.search);
      // Preserve existing query params (course, section, classId)
      params.delete("rounds");
      params.delete("windows");
      for (const r of rounds) params.append("rounds", r);
      for (const w of windows) params.append("windows", w);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, "", newUrl);
    },
    [],
  );

  // Filter to results with valid bid data
  const bidResultsWithBids = useMemo(
    () =>
      allBidResults.filter(
        (r) =>
          r.afterProcessVacancy !== null &&
          r.min !== null &&
          r.median !== null &&
          r.min > 0 &&
          r.median > 0,
      ),
    [allBidResults],
  );

  // Derive rounds & windows that actually exist in the data
  const { dataRounds, dataWindows } = useMemo(
    () => deriveAvailableFromData(bidResultsWithBids),
    [bidResultsWithBids],
  );

  // Derive data-driven round↔window mappings for bidirectional filtering
  const { roundWindows, windowRounds } = useMemo(() => {
    const rw = new Map<string, Set<number>>();
    const wr = new Map<number, Set<string>>();
    for (const br of bidResultsWithBids) {
      const round = br.bidWindow.round;
      const window = br.bidWindow.window;
      if (!rw.has(round)) rw.set(round, new Set());
      rw.get(round)!.add(window);
      if (!wr.has(window)) wr.set(window, new Set());
      wr.get(window)!.add(round);
    }
    return { roundWindows: rw, windowRounds: wr };
  }, [bidResultsWithBids]);

  // Bidirectional: compute available rounds and windows based on selection
  const { availableWindows, availableRounds } = useMemo(() => {
    // Available rounds: from data, further filtered by selected windows
    let availRounds: string[];
    if (selectedWindows.length > 0) {
      const roundSet = new Set<string>();
      for (const w of selectedWindows) {
        const rounds = windowRounds.get(parseInt(w));
        if (rounds) rounds.forEach((r) => roundSet.add(r));
      }
      availRounds = dataRounds.filter((r) => roundSet.has(r));
    } else {
      availRounds = dataRounds;
    }

    // Available windows: from data, further filtered by selected rounds
    let availWindows: string[];
    if (selectedRounds.length > 0) {
      const windowSet = new Set<number>();
      for (const r of selectedRounds) {
        const windows = roundWindows.get(r);
        if (windows) windows.forEach((w) => windowSet.add(w));
      }
      availWindows = dataWindows.filter((w) => windowSet.has(parseInt(w)));
    } else {
      availWindows = dataWindows;
    }

    return { availableRounds: availRounds, availableWindows: availWindows };
  }, [selectedRounds, selectedWindows, dataRounds, dataWindows, roundWindows, windowRounds]);

  // Filter bid results based on selection
  const filteredResults = useMemo(() => {
    return bidResultsWithBids.filter((br) => {
      let match = true;
      if (selectedRounds.length > 0) {
        match = match && selectedRounds.includes(br.bidWindow.round);
      }
      if (selectedWindows.length > 0) {
        match = match && selectedWindows.includes(br.bidWindow.window.toString());
      }
      return match;
    });
  }, [bidResultsWithBids, selectedRounds, selectedWindows]);

  const chartData = useMemo(() => {
    // Group by bidWindow to deduplicate merged section + cross-professor results
    // that map to the same bidWindow string. Conservative aggregation: take the
    // lowest min and median across duplicate entries.
    const grouped = new Map<string, { min: number; median: number; size: number }>();
    for (const br of filteredResults) {
      const key = `${br.bidWindow.acadTermId}/${br.bidWindow.round}/${br.bidWindow.window}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.min = Math.min(existing.min, br.min!);
        existing.median = Math.min(existing.median, br.median!);
        existing.size += br.beforeProcessVacancy - br.afterProcessVacancy!;
      } else {
        grouped.set(key, {
          min: br.min!,
          median: br.median!,
          size: br.beforeProcessVacancy - br.afterProcessVacancy!,
        });
      }
    }
    return sortChartData(
      Array.from(grouped.entries()).map(([bidWindow, vals]) => ({
        bidWindow,
        price: [vals.min, vals.median] as [number, number],
        size: vals.size,
      })),
    );
  }, [filteredResults]);

  // Handlers
  const handleRoundsChange = useCallback(
    (values: string[]) => {
      // Auto-deselect windows that are no longer valid for the selected rounds
      const validWindows = new Set<number>();
      for (const r of values) {
        const windows = roundWindows.get(r);
        if (windows) windows.forEach((w) => validWindows.add(w));
      }
      const newWindows = selectedWindows.filter((w) =>
        validWindows.has(parseInt(w)),
      );

      setSelectedRounds(values);
      setSelectedWindows(newWindows);
      syncUrl(values, newWindows);
    },
    [selectedWindows, syncUrl, roundWindows],
  );

  const handleWindowsChange = useCallback(
    (values: string[]) => {
      // Auto-deselect rounds that don't contain any selected window
      const validRounds = new Set<string>();
      for (const w of values) {
        const rounds = windowRounds.get(parseInt(w));
        if (rounds) rounds.forEach((r) => validRounds.add(r));
      }

      const newRounds = selectedRounds.filter((r) => validRounds.has(r));

      setSelectedWindows(values);
      setSelectedRounds(newRounds);
      syncUrl(newRounds, values);
    },
    [selectedRounds, syncUrl, windowRounds],
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="pt-2 text-2xl">Historical Bidding Trend</CardTitle>
          <CardDescription className="flex flex-col gap-2">
            <div>
              {courseCode} {section} — historical bids across academic terms and
              rounds
            </div>
            <DisclosureDisclaimer />
          </CardDescription>
        </CardHeader>
        {chartData.length > 0 ? (
          <CardContent className="flex flex-col gap-4">
            <BidChart
              chartData={chartData}
              currentWindowBidWindow={currentWindowBidWindow}
            />
            {/* Filter controls — always visible with all data-driven options */}
            {dataRounds.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Round
                </span>
                <TagToggleGroup
                  items={availableRounds.map((r) => ({ label: r, value: r }))}
                  value={selectedRounds}
                  onChange={handleRoundsChange as any}
                />
              </div>
            )}
            {dataWindows.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Window
                </span>
                <TagToggleGroup
                  items={availableWindows.map((w) => ({ label: w, value: w }))}
                  value={selectedWindows}
                  onChange={handleWindowsChange as any}
                />
              </div>
            )}
            {/* Table integrated into the card */}
            <BidTable
              chartData={chartData}
              bidResults={filteredResults}
            />
          </CardContent>
        ) : (
          <CardContent className="text-muted-foreground text-center">
            No bid data available for the selected filters.
          </CardContent>
        )}
      </Card>
    </>
  );
};
