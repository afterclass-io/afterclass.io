import TwemojiClipboard from "~icons/twemoji/clipboard";

import { informationCardTheme } from "./InformationCard.theme";
import { Skeleton } from "@/common/components/Skeleton";

export const InformationCardSkeleton = () => {
  const { wrapper, header, icon, content, description } = informationCardTheme({
    size: { initial: "sm", md: "md" },
  });
  return (
    <div className={wrapper()}>
      <div className={header()}>
        <TwemojiClipboard className={icon()} />
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
