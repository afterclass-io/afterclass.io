import { Separator } from "@/common/components/separator";
import { Skeleton } from "@/common/components/skeleton";

// Route-level streaming shell for /bidding (#523). Mirrors the rendered page:
// two Combobox triggers + separator + the BiddingClassList card grid. Heights
// are the #519 measured scale — no arbitrary values.
export default function Loading() {
  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="flex flex-col gap-4 md:flex-row">
        {/* Combobox triggers render as min-h-12 Buttons (48px). */}
        <Skeleton className="min-h-12 w-full max-w-75 rounded-lg" />
        <Skeleton className="min-h-12 w-full max-w-75 rounded-lg" />
      </div>
      <Separator />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* ClassCard rows: code (text-xl = h-7), name/professor (h-6),
            timings (text-sm = h-5), venue/exam (text-xs = h-4). */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-card flex w-64 flex-col items-start gap-2 rounded-md border p-4 md:gap-4"
          >
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-36" />
          </div>
        ))}
      </div>
    </div>
  );
}
