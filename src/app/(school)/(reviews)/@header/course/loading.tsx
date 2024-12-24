import PhBookBookmarkFill from "~icons/ph/book-bookmark-fill";

import { PageTitle } from "@/common/components/PageTitle";
import { Tag } from "@/common/components/Tag";
import { Skeleton } from "@/common/components/Skeleton";

export default function Loading() {
  return (
    <div className="w-full">
      <PageTitle
        contentLeft={
          <PhBookBookmarkFill className="h-9 w-9 text-text-em-low" />
        }
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
