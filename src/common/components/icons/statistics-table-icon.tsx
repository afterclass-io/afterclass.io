import { CustomIcon, type CustomIconProps } from "./custom-icon";

export const StatisticsTableIcon = (props: CustomIconProps) => {
  return (
    <CustomIcon {...props}>
      <path
        fill="currentColor"
        d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2m0 16H5V5h14zM9 17H7V7h2zm4 0h-2v-7h2zm4 0h-2v-5h2z"
      />
    </CustomIcon>
  );
};
