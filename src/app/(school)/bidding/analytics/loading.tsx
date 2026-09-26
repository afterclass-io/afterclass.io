import { Card, CardContent, CardHeader } from "@/common/components/card";
import { Skeleton } from "@/common/components/skeleton";

// Mirrors the resolved analytics layout: the class-info Card, the chart Card
// BidAnalyticsClient renders (its own chart fallback is `aspect-video w-full`),
// the BidPredictionCard and the ModAlternativesCard. The container width
// matches the page's `flex w-full max-w-5xl flex-col gap-6 pt-2`.
export default function Loading() {
  return (
    <div className="flex w-full max-w-5xl flex-col gap-6 pt-2">
      {/* Class Info Summary Card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-5 w-20" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-6 w-28" />
              </div>
            ))}
          </div>
          <Skeleton className="h-28 w-full" />
          <div className="flex justify-end pt-2">
            <Skeleton className="h-9 w-36" />
          </div>
        </CardContent>
      </Card>

      {/* Chart + filters + table */}
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-5 w-full max-w-md" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>

      {/* Bid Prediction Card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>

      {/* Explore Alternatives Card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, column) => (
            <div key={column} className="flex flex-col gap-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
