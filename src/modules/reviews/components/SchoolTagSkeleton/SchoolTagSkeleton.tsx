import { Skeleton } from "@/common/components/skeleton";
import { Tag } from "@/common/components/tag";

export const SchoolTagSkeleton = () => {
  return (
    <Tag
      className="border-default rounded-full"
      deletable={false}
      variant="outline"
      avatar={<Skeleton className="h-6 w-6" />}
    >
      <Skeleton className="h-[23.98px] w-[36.31px]" />
    </Tag>
  );
};
