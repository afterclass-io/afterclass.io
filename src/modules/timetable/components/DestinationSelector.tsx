"use client";

import Link from "next/link";
import { Button } from "@/common/components/button";

/**
 * Three link-buttons under the class info card pointing at the existing
 * destination pages for the selected class. Each destination is a full page,
 * so the row reads as a selector over the three available views rather than
 * a tab switch. The professor link only renders when the class has a
 * professor slug (TBA classes have none — same rule as ReviewCtaButtons).
 */
export function DestinationSelector({
  courseCode,
  section,
  classId,
  professorSlug,
}: {
  courseCode: string;
  section: string;
  classId: string;
  professorSlug: string | null;
}) {
  return (
    <div
      className="flex flex-nowrap items-center gap-2 overflow-x-auto"
      data-test="class-destinations"
    >
      <Button variant="outline" size="sm" className="shrink-0" asChild>
        <Link
          href={`/bidding/analytics?course=${courseCode}&section=${section}&classId=${classId}`}
        >
          Historical Data
        </Link>
      </Button>
      <Button variant="outline" size="sm" className="shrink-0" asChild>
        <Link href={`/course/${courseCode}`}>Course Reviews</Link>
      </Button>
      {professorSlug && (
        <Button variant="outline" size="sm" className="shrink-0" asChild>
          <Link href={`/professor/${professorSlug}`}>Professor Reviews</Link>
        </Button>
      )}
    </div>
  );
}
