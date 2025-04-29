import type { ReactNode, ComponentPropsWithoutRef } from "react";
import { FilterToggleSectionItemsSkeleton } from "../FilterToggleSectionSkeleton";
import { cn } from "@/common/functions";

export const FilterToggleSectionItems = ({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  children: ReactNode;
}) => {
  return (
    <div
      data-slot="filter-toggle-section-items"
      className={cn(
        "flex flex-col items-start gap-0 self-stretch md:flex-row md:flex-wrap md:content-start md:gap-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

FilterToggleSectionItems.Skeleton = FilterToggleSectionItemsSkeleton;
