import { PenIcon } from "@/common/components/CustomIcon";
import { reviewSectionTheme } from "./ReviewSection.theme";

export type ReviewSectionHeaderProps = {
  children?: React.ReactNode;
};

export const ReviewSectionHeader = ({ children }: ReviewSectionHeaderProps) => {
  const { header, title, icon } = reviewSectionTheme({
    size: { initial: "sm", md: "md" },
  });
  return (
    <div className={header()}>
      <div className={title()}>
        <PenIcon className={icon()} />
        <p>Reviews</p>
      </div>
      {children}
    </div>
  );
};

export const ReviewSectionHeaderSkeleton = ({
  children,
}: ReviewSectionHeaderProps) => {
  const { header, title, icon } = reviewSectionTheme({
    size: { initial: "sm", md: "md" },
  });
  return (
    <div className={header()}>
      <div className={title()}>
        <PenIcon className={icon()} />
        <p>Reviews</p>
      </div>
      {children}
    </div>
  );
};
