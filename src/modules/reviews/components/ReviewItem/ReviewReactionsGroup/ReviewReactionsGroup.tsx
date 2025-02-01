import { Button } from "@/common/components/Button";
import {
  LoudlyCryingFaceEmoji,
  RoflEmoji,
} from "@/common/components/CustomIcon";

export const ReviewReactionsGroup = () => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="flex gap-1">
      <Button
        size="sm"
        variant="tertiary"
        rounded
        iconLeft={<LoudlyCryingFaceEmoji />}
        onClick={handleClick}
      >
        2
      </Button>
      <Button
        size="sm"
        variant="tertiary"
        rounded
        iconLeft={<RoflEmoji />}
        onClick={handleClick}
      >
        2
      </Button>
    </div>
  );
};
