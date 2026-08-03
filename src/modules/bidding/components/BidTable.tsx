"use client";

import { useState, useMemo, useCallback } from "react";
import { inferAcadTerm } from "@/common/functions";
import { compareRounds } from "@/modules/bidding/utils/round-order";
import { Button } from "@/common/components/button";
import { ChevronDown, ChevronUp, ArrowUpDown, Info } from "lucide-react";
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
  const termGroups = useMemo(() => {
    const groups: { acadTermId: string; startIdx: number; endIdx: number }[] = [];
    let current: string | null = null;
    for (let i = 0; i < chartData.length; i++) {
      const [acadTermId] = chartData[i]!.bidWindow.split("/");
      if (acadTermId !== current) {
        if (current !== null && groups.length > 0) {
          groups[groups.length - 1]!.endIdx = i - 1;
        }
        groups.push({ acadTermId: acadTermId!, startIdx: i, endIdx: chartData.length - 1 });
        current = acadTermId!;
      }
    }
    return groups;
  }, [chartData]);

  // Build flattened rows with all display values pre-computed
  const flatRows: FlatRow[] = useMemo(() => {
    return chartData.map((row, i) => {
      const [acadTermId, round, window] = row.bidWindow.split("/");
      if (!acadTermId) {
        // Malformed bidWindow string — skip this row
        return null;
      }
      const { displayYear, term } = inferAcadTerm(acadTermId);
      const groupIdx = termGroups.findIndex(
        (g) => i >= g.startIdx && i <= g.endIdx,
      );
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
  }, [chartData, termGroups, profMap, sectionMap]);

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

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown size={14} className="text-muted-foreground/40" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp size={16} className="text-primary" />
    ) : (
      <ChevronDown size={16} className="text-primary" />
    );
  };

  const Th = ({ column, label, align = "left" }: { column: SortColumn; label: string; align?: "left" | "right" }) => (
    <th
      className={`px-3 py-2 font-medium cursor-pointer select-none hover:bg-muted/30 transition-colors ${align === "right" ? "text-right" : "text-left"}`}
      onClick={() => handleSort(column)}
    >
      <div className={`inline-flex items-center gap-1 ${align === "right" ? "justify-end" : "justify-start"}`}>
        {label}
        <SortIcon column={column} />
      </div>
    </th>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <Th column="term" label="Term" />
              <Th column="section" label="Section" />
              <Th column="professor" label="Professor" />
              <Th column="round" label="Round" />
              <Th column="window" label="Window" />
              <Th column="min" label="Min (e$)" align="right" />
              <Th column="median" label="Median (e$)" align="right" />
              <th
                className="px-3 py-2 font-medium cursor-pointer select-none hover:bg-muted/30 transition-colors text-right"
                onClick={() => handleSort("seats")}
              >
                <div className="inline-flex items-center gap-1 justify-end">
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
                  <SortIcon column="seats" />
                </div>
              </th>
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
                    {row.min}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {row.median}
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
