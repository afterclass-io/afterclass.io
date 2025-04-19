import { CustomIcon, type CustomIconProps } from "./custom-icon";

export const ChevronDownIcon = (props: CustomIconProps) => {
  return (
    <CustomIcon viewBox="0 0 24 24" {...props}>
      <path
        d="M7.41 9L12 13.58L16.59 9L18 10.41L12 16.41L6 10.41L7.41 9Z"
        fill="currentColor"
      />
    </CustomIcon>
  );
};
