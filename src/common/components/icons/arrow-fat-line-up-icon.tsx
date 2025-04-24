import { CustomIcon, type CustomIconProps } from "./custom-icon";

export const ArrowFatLineUpIcon = (props: CustomIconProps) => {
  return (
    <CustomIcon
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M9 19h6" />
      <path d="M9 15v-3H5l7-7 7 7h-4v3H9z" />
    </CustomIcon>
  );
};
