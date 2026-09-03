import { Card, CardContent, CardHeader } from "@/common/components/card";
import { Skeleton } from "@/common/components/skeleton";

// Route-level streaming shell for /bidding/analytics (#523). The data-heavy
// state renders class-info Card + chart Card + prediction/alternatives Cards;
// the shell mirrors that stack. Heights are the #519 measured scale — no
// arbitrary values.
export default function Loading() {
  return (
    <div className="flex w-full max-w-5xl flex-col gap-6 pt-2">
      {/* Class info summary Card: title (text-xl = h-7), CardDescription
          (text-sm = h-5), 3-col grid rows (text-sm), table rows (text-xs),
          AddToTimetableButton (Button h-9). */}
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <div className="flex justify-end pt-2">
            <Skeleton className="h-9 w-32" />
          </div>
        </CardContent>
      </Card>

      {/* BidAnalyticsClient chart — 16:9 box, same as its #515 loading
          skeleton (aspect-video w-full). */}
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="aspect-video w-full" />
        </CardContent>
      </Card>

      {/* BidPredictionCard: title + SuccessRateSlider (h-9) + text rows. */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
        </CardContent>
      </Card>

      {/* ModAlternativesCard: title + professor/session rows. */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-44" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </CardContent>
      </Card>
    </div>
  );
}
