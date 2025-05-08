import { BooksIcon } from "@/common/components/icons";
import { PageTitle } from "@/common/components/page-title";
import { Tag } from "@/common/components/tag";
import { Skeleton } from "@/common/components/skeleton";

export default function Loading() {
  return (
    <div className="w-full">
      <PageTitle
        contentLeft={<BooksIcon className="text-muted-foreground h-9 w-9" />}
        contentRight={
          <Tag
            className="border-default rounded-full"
            deletable={false}
            variant="outline"
            avatar={<Skeleton className="h-6 w-6" />}
          >
            <Skeleton className="h-[23.98px] w-[36.31px]" />
          </Tag>
        }
      >
        <Skeleton className="h-[23.98px] w-[200px]" />
      </PageTitle>
    </div>
  );
}
