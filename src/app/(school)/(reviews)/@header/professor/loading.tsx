import { GraduationCapIcon } from "@/common/components/icons";
import { PageTitle } from "@/common/components/page-title";
import { Skeleton } from "@/common/components/skeleton";
import { Tag } from "@/common/components/tag";

export default function Loading() {
  return (
    <div className="w-full">
      <PageTitle
        contentLeft={<GraduationCapIcon className="h-9 w-9" />}
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
