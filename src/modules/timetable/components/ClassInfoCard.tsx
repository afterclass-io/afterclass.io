"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/common/components/card";
import { formatDateSGT } from "@/common/functions/format-date-sgt";
import type { ClassTimingLike } from "@/modules/timetable/functions/slot-math";
import type { ClassExamTiming } from "./TimetableGrid";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Data the Class Information card closes over. Extracted verbatim from the
 * original SlotBidPanel so the shared bid dialog reuses the same markup
 * (mirrors /bidding/analytics). `courseName` is carried for consumers that
 * render it in their own dialog header.
 */
export type ClassInfoCardProps = {
  courseCode: string;
  courseName: string;
  section: string;
  professorName?: string | null;
  creditUnits: number;
  timings: ClassTimingLike[];
  examTimings: ClassExamTiming[];
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Class information card: professor, section, credit units, and the meeting +
 * exam schedule (BOSS-style table). Destination links (historical data,
 * course/professor reviews) live in the dialog's own selector row.
 */
export function ClassInfoCard({
  section,
  professorName,
  creditUnits,
  timings,
  examTimings,
  children,
}: ClassInfoCardProps & { children?: React.ReactNode }) {
  const datedExamTimings = examTimings.filter((t) => t.date);

  return (
    <Card className="gap-2" data-test="class-info-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Class Information</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-xs">Professor</span>
            <p className="font-medium">{professorName ?? "TBA"}</p>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-xs">Section</span>
            <p className="font-medium">{section}</p>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-xs">Credit Units</span>
            <p className="font-medium">{creditUnits}</p>
          </div>
        </div>

        {/* Meeting Information — BOSS-style table */}
        {timings.length > 0 || datedExamTimings.length > 0 ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b">
                <th className="py-1 pr-3 text-left font-medium">Type</th>
                <th className="py-1 pr-3 text-left font-medium">Day</th>
                <th className="py-1 pr-3 text-left font-medium">Time</th>
                <th className="py-1 text-left font-medium">Venue</th>
              </tr>
            </thead>
            <tbody>
              {timings.map((t, i) => (
                <tr key={`class-${i}`} className="border-border/50 border-b">
                  <td className="py-1.5 pr-3 font-medium">Class</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">
                    {t.dayOfWeek ?? "—"}
                  </td>
                  <td className="py-1.5 pr-3 font-mono whitespace-nowrap tabular-nums">
                    {t.startTime}-{t.endTime}
                  </td>
                  <td className="text-foreground py-1.5">{t.venue ?? "—"}</td>
                </tr>
              ))}
              {datedExamTimings.map((t, i) => (
                <tr key={`exam-${i}`} className="border-border/50 border-b">
                  <td className="py-1.5 pr-3 font-medium">Exam</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">
                    {formatDateSGT(t.date, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                    {t.dayOfWeek && (
                      <>
                        <br />
                        <span>{t.dayOfWeek}</span>
                      </>
                    )}
                  </td>
                  <td className="py-1.5 pr-3 font-mono whitespace-nowrap tabular-nums">
                    {t.startTime}-{t.endTime}
                  </td>
                  <td className="text-foreground py-1.5">{t.venue ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-muted-foreground text-sm italic">
            No schedule data available
          </p>
        )}

        {children ? <div className="pt-2">{children}</div> : null}
      </CardContent>
    </Card>
  );
}
