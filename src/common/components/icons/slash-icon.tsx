import { CustomIcon, type CustomIconProps } from "./custom-icon";

export const SlashIcon = (props: CustomIconProps) => {
  return (
    <CustomIcon
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      {...props}
    >
      <path
        d="M4.10876 14L9.46582 1H10.8178L5.46074 14H4.10876Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      ></path>
    </CustomIcon>
  );
};
