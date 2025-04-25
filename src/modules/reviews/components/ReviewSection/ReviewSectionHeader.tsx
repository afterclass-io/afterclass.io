import { PenIcon } from "@/common/components/icons";

export type ReviewSectionHeaderProps = {
  children?: React.ReactNode;
};

export const ReviewSectionHeader = ({ children }: ReviewSectionHeaderProps) => {
  return (
    <div className="flex flex-col items-start justify-between p-4 pr-0 pb-0 md:flex-row md:items-center">
      <div className="flex items-center gap-2 font-semibold md:gap-4">
        <PenIcon className="size-4 rotate-90 md:size-6" />
        <div className="text-lg md:text-2xl">Reviews</div>
      </div>
      {children}
    </div>
  );
};
