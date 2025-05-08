import { CustomIcon, type CustomIconProps } from "./custom-icon";

export const MinusIcon = (props: CustomIconProps) => {
  return (
    <CustomIcon viewBox="0 0 15 16" {...props}>
      <rect width="15" height="15" transform="translate(0 0.5)" fill="none" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.25 8C2.25 7.72386 2.47386 7.5 2.75 7.5H12.25C12.5261 7.5 12.75 7.72386 12.75 8C12.75 8.27614 12.5261 8.5 12.25 8.5H2.75C2.47386 8.5 2.25 8.27614 2.25 8Z"
        fill="currentColor"
      />
    </CustomIcon>
  );
};
