import { informationCardTheme } from "./InformationCard.theme";
import { ClipboardIcon } from "@/common/components/icons";
import { Skeleton } from "@/common/components/skeleton";

export const InformationCardSkeleton = () => {
  const { wrapper, header, icon, content, description } = informationCardTheme({
    size: { initial: "sm", md: "md" },
  });
  return (
    <div className={wrapper()}>
      <div className={header()}>
        <ClipboardIcon className={icon()} />
        <p>Information</p>
      </div>
      <div className={content()}>
        <div className={description()}>
          <Skeleton className="h-[60px] w-full" />
        </div>
      </div>
    </div>
  );
};
