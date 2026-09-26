import { Separator } from "@/common/components/separator";
import { Skeleton } from "@/common/components/skeleton";

// Mirrors the Combobox trigger Button (`bg-card min-h-12 w-full max-w-75
// flex-1 self-stretch rounded-lg`) and the ClassCard link
// (`bg-card h-auto w-64 rounded-md border p-4`, three stacked content groups).
const ComboboxTriggerSkeleton = () => (
  <Skeleton
    data-test="combobox-trigger"
    className="bg-card min-h-12 w-full max-w-75 flex-1 self-stretch rounded-lg border"
  />
);

const ClassCardSkeleton = () => (
  <div className="bg-card flex h-auto w-64 flex-col items-start justify-start gap-2 rounded-md border p-4 md:gap-4">
    <div className="flex w-full flex-col items-start gap-1">
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-2/3" />
    </div>
    <div className="flex flex-col gap-2">
      <Skeleton className="h-5 w-40" />
    </div>
    <div className="flex flex-col gap-2">
      <Skeleton className="h-5 w-32" />
    </div>
  </div>
);

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="flex flex-col gap-4 md:flex-row">
        <ComboboxTriggerSkeleton />
        <ComboboxTriggerSkeleton />
      </div>
      <Separator />
      {/* Matches the initial classes view: `grid grid-cols-1 gap-4
          md:grid-cols-2` inside BiddingClassList. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <ClassCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
