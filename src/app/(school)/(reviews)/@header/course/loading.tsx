import { BooksIcon } from "@/common/components/icons";
import { PageTitle } from "@/common/components/page-title";
import { Skeleton } from "@/common/components/skeleton";
import { SchoolTagSkeleton } from "@/modules/reviews/components/SchoolTagSkeleton";

export default function Loading() {
  return (
    <div className="w-full">
      <PageTitle
        contentLeft={<BooksIcon className="text-muted-foreground h-9 w-9" />}
        contentRight={<SchoolTagSkeleton />}
      >
        <Skeleton className="h-14 w-[200px] md:h-9" />
      </PageTitle>
    </div>
  );
}
