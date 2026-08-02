"use client";

import { useEffect, useMemo } from "react";
import { useAtom } from "jotai";
import { useSearchParams } from "next/navigation";
import { api } from "@/common/tools/trpc/react";
import { selectedTermIdAtom } from "@/modules/timetable/atoms/timetable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/select";
import { Skeleton } from "@/common/components/skeleton";
import { cn } from "@/common/functions";

export type TermPickerProps = {
  className?: string;
};

/**
 * Dropdown that lists all academic terms via `api.acadTerms.list`.
 *
 * Initial selection: a valid `?acadTermId=` deep link (e.g. from a roadmap's
 * TermTimetableLink) wins; otherwise defaults to the term of the
 * current/upcoming bid window (via `api.bidWindows.getCurrentWindow`),
 * falling back to the calendar-based `api.acadTerms.current` when no bid
 * windows exist. Selecting a term writes to `selectedTermIdAtom`.
 *
 * NOTE: uses `useSearchParams`, so it must sit inside a <Suspense> boundary.
 */
export function TermPicker({ className }: TermPickerProps) {
  const [selectedTermId, setSelectedTermId] = useAtom(selectedTermIdAtom);
  const searchParams = useSearchParams();
  const deepLinkTermId = searchParams.get("acadTermId");

  const termsQuery = api.acadTerms.list.useQuery();
  const currentWindowQuery = api.bidWindows.getCurrentWindow.useQuery();
  // Fallback only — skipped while the bid-window lookup is still in flight.
  const currentTermQuery = api.acadTerms.current.useQuery(undefined, {
    enabled: currentWindowQuery.isSuccess && currentWindowQuery.data === null,
  });

  const terms = useMemo(() => termsQuery.data ?? [], [termsQuery.data]);

  // Auto-select on first load: a valid deep link wins, else the current bid
  // term. Runs only while nothing is selected, so later manual changes (and
  // in-app navigations) are never overridden.
  useEffect(() => {
    if (selectedTermId) return;
    // Wait for the terms list so the deep link can be validated.
    if (termsQuery.isLoading) return;
    if (deepLinkTermId && terms.some((t) => t.id === deepLinkTermId)) {
      setSelectedTermId(deepLinkTermId);
      return;
    }
    const bidTermId = currentWindowQuery.data?.acadTermId;
    if (bidTermId) {
      setSelectedTermId(bidTermId);
    } else if (currentWindowQuery.isSuccess && currentTermQuery.data?.id) {
      setSelectedTermId(currentTermQuery.data.id);
    }
  }, [
    selectedTermId,
    termsQuery.isLoading,
    deepLinkTermId,
    terms,
    currentWindowQuery.data,
    currentWindowQuery.isSuccess,
    currentTermQuery.data,
    setSelectedTermId,
  ]);

  const isLoading = termsQuery.isLoading || currentWindowQuery.isLoading;

  if (isLoading) {
    return <Skeleton className={cn("h-9 w-48", className)} />;
  }

  return (
    <Select
      value={selectedTermId ?? undefined}
      onValueChange={(id) => setSelectedTermId(id)}
    >
      <SelectTrigger
        className={cn("w-56", className)}
        size="sm"
        data-test="timetable-term-picker"
      >
        <SelectValue placeholder="Pick a term…" />
      </SelectTrigger>
      <SelectContent>
        {terms.map((t) => (
          <SelectItem
            key={t.id}
            value={t.id}
            data-test={`timetable-term-${t.id}`}
          >
            {t.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
