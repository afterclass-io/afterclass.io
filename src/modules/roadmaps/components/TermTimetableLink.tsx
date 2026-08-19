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

import {
  mapRoadmapTermToAcadCode,
  extractAcadTermCode,
} from "@/modules/roadmaps/functions/term-mapping";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TermTimetableLink({
  term,
  acadTerms,
  className,
}: TermTimetableLinkProps) {
  const targetTermCode = mapRoadmapTermToAcadCode(term);

  // Find AcadTerms whose label term matches our target
  const matchingTerms = acadTerms.filter((at) => {
    const code = extractAcadTermCode(at.label);
    return code === targetTermCode;
  });

  if (matchingTerms.length === 0) return null;

  // Show the first matching AcadTerm (most relevant)
  const matched = matchingTerms[0]!;

  return (
    <Link
      href={`/timetable?acadTermId=${encodeURIComponent(matched.id)}`}
      className={cn(
        "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-primary inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
        className,
      )}
      data-test="term-timetable-link"
    >
      <ExternalLink className="size-3" />
      <span>View timetable →</span>
    </Link>
  );
}
