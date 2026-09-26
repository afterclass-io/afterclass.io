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
          <Tag
            className="border-default rounded-full"
            deletable={false}
            variant="outline"
            avatar={<Skeleton className="h-6 w-6" />}
          >
            <Skeleton className="h-5 w-9" />
          </Tag>
        }
      >
        <Skeleton className="h-7 w-[200px] md:h-9" />
      </PageTitle>
    </div>
  );
}
