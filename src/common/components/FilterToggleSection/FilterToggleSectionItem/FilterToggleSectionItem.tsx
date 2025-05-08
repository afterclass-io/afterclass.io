import { Checkbox, type CheckedState } from "@/common/components/checkbox";
import { cn } from "@/common/functions";

export type FilterStat = {
  icon: React.ReactNode;
  stat: number;
};

export type FilterItem = {
  value: string; // form value
  label: string; // label shown to user
  sublabel?: string; // additional label shown to user
  selected?: boolean; // whether the item is selected
  filterStats: FilterStat[];
};

export type FilterToggleSectionItemProps =
  React.ComponentPropsWithoutRef<"div"> & FilterItem;

export const FilterItemStats = ({ icon, stat }: FilterStat) => {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <p data-test="filter-item-value">{stat}</p>
    </div>
  );
};

export const FilterToggleSectionItem = ({
  label,
  sublabel,
  filterStats,
  selected,
  ...props
}: FilterToggleSectionItemProps) => {
  return (
    <div
      data-slot="filter-toggle-section-item"
      className={cn(
        "group hover:bg-accent flex cursor-pointer items-center gap-2 self-stretch rounded-lg py-2 pr-2 pl-1 md:w-64 md:gap-4 md:border md:p-3",
        selected && "bg-accent",
      )}
      {...props}
    >
      <Checkbox checked={selected as CheckedState} />
      <div className="flex flex-[1_0_0] items-center justify-between gap-2 md:flex-auto md:flex-col md:items-start md:justify-center">
        <p className="text-accent-foreground line-clamp-1 flex-[1_0_0] leading-4 font-medium text-ellipsis md:line-clamp-none md:flex-auto md:text-sm md:font-semibold">
          {label}
        </p>
        <div className="flex items-center justify-between self-stretch sm:gap-2">
          {sublabel && (
            <p
              className="text-muted-foreground line-clamp-1 flex-[1_0_0] leading-4 font-medium text-ellipsis md:line-clamp-none md:flex-auto md:text-sm md:font-semibold"
              data-test="filter-item-label"
            >
              {sublabel}
            </p>
          )}
          <div className="text-muted-foreground flex items-center gap-3 md:gap-4">
            {filterStats?.map((stat, index) => (
              <FilterItemStats key={index} {...stat} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
