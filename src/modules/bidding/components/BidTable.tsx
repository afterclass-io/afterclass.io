"use client";

import { useState, useMemo, useCallback } from "react";
import { inferAcadTerm } from "@/common/functions";
import { formatBidCurrency } from "@/common/functions/format-bid-currency";
import { compareRounds } from "@/modules/bidding/utils/round-order";
import {
  computeAcadTermGroups,
  buildGroupIndexMap,
} from "@/modules/bidding/utils/acad-term-groups";
import { Button } from "@/common/components/button";
import { ArrowDown, ArrowUp, ArrowUpDown, Info } from "lucide-react";
import { Th, SortableTh } from "@/common/components/table-primitives";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/tooltip";

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
}

const DEFAULT_VISIBLE_ROWS = 10;

interface BidTableProps {
  chartData: {
    bidWindow: string;
    price: [number, number];
    size: number;
  }[];
  bidResults: BidResultRow[];
}

type SortColumn = "term" | "section" | "professor" | "round" | "window" | "min" | "median" | "seats";
type SortDirection = "asc" | "desc";

/** Flat display row with pre-computed values for sorting and rendering */
interface FlatRow {
  bidWindow: string;
  acadTermId: string;
  displayYear: string;
  term: string;
  section: string;
  professor: string;
  round: string;
  window: string;
  min: number;
  median: number;
  seats: number;
  groupIdx: number;
}

export const BidTable = ({ chartData, bidResults }: BidTableProps) => {
  const [showAll, setShowAll] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Build lookup maps from bidResults
  const { profMap, sectionMap } = useMemo(() => {
    const profMap = new Map<string, string>();
    const sectionMap = new Map<string, string>();
    for (const br of bidResults) {
      const key = `${br.bidWindow.acadTermId}/${br.bidWindow.round}/${br.bidWindow.window}`;
      if (!profMap.has(key) && br.class.professor?.name) {
        profMap.set(key, br.class.professor.name);
      }
      if (!sectionMap.has(key) && br.class.section) {
        sectionMap.set(key, br.class.section);
      }
    }
    return { profMap, sectionMap };
  }, [bidResults]);

  // Compute academic term groups for zebra striping
  const groupIndexMap = useMemo(() => {
    const groups = computeAcadTermGroups(chartData);
    return buildGroupIndexMap(chartData, groups);
  }, [chartData]);

  // Build flattened rows with all display values pre-computed
  const flatRows: FlatRow[] = useMemo(() => {
    return chartData.map((row, _i) => {
      const [acadTermId, round, window] = row.bidWindow.split("/");
      if (!acadTermId) {
        // Malformed bidWindow string — skip this row
        return null;
      }
      const { displayYear, term } = inferAcadTerm(acadTermId);
      const groupIdx = groupIndexMap.get(row.bidWindow) ?? 0;
      return {
        bidWindow: row.bidWindow,
        acadTermId: acadTermId,
        displayYear,
        term,
        section: sectionMap.get(row.bidWindow) ?? "—",
        professor: profMap.get(row.bidWindow) ?? "—",
        round: round ?? "",
        window: window ?? "",
        min: row.price[0],
        median: row.price[1],
        seats: row.size,
        groupIdx,
      };
    }).filter((row): row is FlatRow => row !== null);
  }, [chartData, groupIndexMap, profMap, sectionMap]);

  const handleSort = useCallback(
    (column: SortColumn) => {
      if (sortColumn === column) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortColumn(column);
        setSortDirection("asc");
      }
    },
    [sortColumn],
  );

  // Sort the flattened rows
  const sortedRows = useMemo(() => {
    if (!sortColumn) {
      // Default: newest first (reverse of chronological chartData order)
      return [...flatRows].reverse();
    }
    return [...flatRows].sort((a, b) => {
      let cmp: number;
      if (sortColumn === "term") {
        // Use acadTermId for correct academic term ordering
        // "AY202425T1" < "AY202425T2" < "AY202526T1" lexicographically
        cmp = a.acadTermId.localeCompare(b.acadTermId);
      } else if (sortColumn === "round") {
        // Use BOSS round ordering ("1" < "1A" < "1B" < ... < "2A")
        cmp = compareRounds(a.round, b.round);
      } else if (sortColumn === "window") {
        // Numeric comparison for window numbers
        cmp = (parseInt(a.window) || 0) - (parseInt(b.window) || 0);
      } else {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        if (typeof aVal === "string" && typeof bVal === "string") {
          cmp = aVal.localeCompare(bVal);
        } else if (typeof aVal === "number" && typeof bVal === "number") {
          cmp = aVal - bVal;
        } else {
          cmp = String(aVal).localeCompare(String(bVal));
        }
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [flatRows, sortColumn, sortDirection]);

  const visibleRows = showAll ? sortedRows : sortedRows.slice(0, DEFAULT_VISIBLE_ROWS);
  const hiddenCount = chartData.length - DEFAULT_VISIBLE_ROWS;

  const sharedThClass =
    "h-auto py-2 font-medium cursor-pointer select-none hover:bg-muted/30 transition-colors normal-case tracking-normal";

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <SortableTh
                label="Term"
                active={sortColumn === "term"}
                dir={sortDirection}
                onClick={() => handleSort("term")}
                className={sharedThClass}
              />
              <SortableTh
                label="Section"
                active={sortColumn === "section"}
                dir={sortDirection}
                onClick={() => handleSort("section")}
                className={sharedThClass}
              />
              <SortableTh
                label="Professor"
                active={sortColumn === "professor"}
                dir={sortDirection}
                onClick={() => handleSort("professor")}
                className={sharedThClass}
              />
              <SortableTh
                label="Round"
                active={sortColumn === "round"}
                dir={sortDirection}
                onClick={() => handleSort("round")}
                className={sharedThClass}
              />
              <SortableTh
                label="Window"
                active={sortColumn === "window"}
                dir={sortDirection}
                onClick={() => handleSort("window")}
                className={sharedThClass}
              />
              <SortableTh
                label="Min (e$)"
                active={sortColumn === "min"}
                dir={sortDirection}
                onClick={() => handleSort("min")}
                className={`${sharedThClass} text-right`}
              />
              <SortableTh
                label="Median (e$)"
                active={sortColumn === "median"}
                dir={sortDirection}
                onClick={() => handleSort("median")}
                className={`${sharedThClass} text-right`}
              />
              <Th
                className={`${sharedThClass} text-right`}
                aria-sort={
                  sortColumn === "seats"
                    ? sortDirection === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                <button
                  type="button"
                  onClick={() => handleSort("seats")}
                  className="hover:text-foreground inline-flex items-center gap-1 flex-row-reverse"
                >
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 cursor-help">
                        Seats Taken
                        <Info size={12} className="text-muted-foreground shrink-0" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs">
                      available seats before bidding minus available seats after bidding.
                    </TooltipContent>
                  </Tooltip>
                  {sortColumn === "seats" ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="size-3" />
                    ) : (
                      <ArrowDown className="size-3" />
                    )
                  ) : (
                    <ArrowUpDown className="size-3 opacity-50" />
                  )}
                </button>
              </Th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, i) => {
              const isEvenGroup = row.groupIdx % 2 === 0;
              return (
                <tr
                  key={`${row.bidWindow}-${row.section}-${i}`}
                  className={`border-b hover:bg-muted/30 ${isEvenGroup ? "" : "bg-muted/20"}`}
                >
                  <td className="px-3 py-2 font-mono text-xs">
                    {row.displayYear} T{row.term}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{row.section}</td>
                  <td className="px-3 py-2">{row.professor}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.round}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.window}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {formatBidCurrency(row.min)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {formatBidCurrency(row.median)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {row.seats}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {hiddenCount > 0 && !showAll && (
        <Button
          variant="ghost"
          size="sm"
          className="self-center text-muted-foreground text-xs"
          onClick={() => setShowAll(true)}
        >
          Show all {chartData.length} rows ({hiddenCount} more)
        </Button>
      )}
      {showAll && chartData.length > DEFAULT_VISIBLE_ROWS && (
        <Button
          variant="ghost"
          size="sm"
          className="self-center text-muted-foreground text-xs"
          onClick={() => setShowAll(false)}
        >
          Show less
        </Button>
      )}
    </div>
  );
};
