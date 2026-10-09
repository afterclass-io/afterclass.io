import { Separator } from "@/common/components/separator";
import { Skeleton } from "@/common/components/skeleton";

// Sizes follow the rendered `/bidding` page, measured at 1400 px and 375 px:
// two comboboxes `min-h-12` (48 px, 42 px on a 14 px root), then a grid of
// `w-64` class cards. Cards render 146 to 266 px tall, so 15 rem sits in the
// middle of the range (240 px, 210 px on a 14 px root). All values are rem, so
// they scale with the root font size like the real page does.
const CARD_COUNT = 6;

export const BiddingExplorerSkeleton = () => (
  <div className="flex flex-col gap-6 pt-2">
    <div className="flex flex-col gap-4 md:flex-row">
      <Skeleton className="min-h-12 w-full max-w-80 flex-1 rounded-lg" />
      <Skeleton className="min-h-12 w-full max-w-80 flex-1 rounded-lg" />
    </div>
    <Separator />
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: CARD_COUNT }, (_, index) => (
          <Skeleton key={index} className="h-60 w-64 rounded-md" />
        ))}
      </div>
    </div>
  </div>
);
