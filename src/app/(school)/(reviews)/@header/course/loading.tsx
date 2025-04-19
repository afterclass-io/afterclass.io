import { BooksIcon } from "@/common/components/icons";
import { PageTitle } from "@/common/components/PageTitle";
import { Tag } from "@/common/components/tag";
import { Skeleton } from "@/common/components/skeleton";

export default function Loading() {
  return (
    <div className="w-full">
      <PageTitle
        contentLeft={<BooksIcon className="text-text-em-low h-9 w-9" />}
        contentRight={
          <Tag contentLeft={<Skeleton className="h-6 w-6" />}>
            <Skeleton className="h-[23.98px] w-[36.31px]" />
          </Tag>
        }
      >
        <Skeleton className="h-[23.98px] w-[200px]" />
      </PageTitle>
    </div>
  );
}
