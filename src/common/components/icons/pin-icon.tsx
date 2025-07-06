import { CustomIcon, type CustomIconProps } from "./custom-icon";

export const PinIcon = (props: CustomIconProps) => {
  return (
    <CustomIcon
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      {...props}
    >
      <ellipse cx={18} cy={34.5} fill="#292f33" rx={4} ry={1.5}></ellipse>
      <path
        fill="#99aab5"
        d="M14.339 10.725S16.894 34.998 18.001 35s3.66-24.275 3.66-24.275z"
      ></path>
      <circle cx={18} cy={8} r={8} fill="#dd2e44"></circle>
    </CustomIcon>
  );
};
