"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { AcadTermSummary } from "@/common/tools/acad-term";
import { cn } from "@/common/functions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TermTimetableLinkProps = {
  yearNumber: number;
  term: string;
  acadTerms: AcadTermSummary[];
  className?: string;
};

import { findAcadTermForRoadmapTerm } from "@/modules/roadmaps/functions/term-mapping";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TermTimetableLink({
  term,
  acadTerms,
  className,
}: TermTimetableLinkProps) {
  const matched = findAcadTermForRoadmapTerm(term, acadTerms);

  if (!matched) return null;

  return (
    <Link
      href={`/timetable?acadTermId=${encodeURIComponent(matched.id)}`}
      className={cn(
        "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-primary inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
        className,
      )}
      data-test="term-timetable-link"
    >
      <ExternalLink className="size-3" />
      <span>View timetable →</span>
    </Link>
  );
}
