import { CustomIcon, type CustomIconProps } from "./CustomIcon";

export const CircleIcon = (props: CustomIconProps) => {
  return (
    <CustomIcon
      width="16"
      height="16"
      viewBox="0 0 256 256"
      fill="none"
      {...props}
    >
      <path
        fill="currentColor"
        d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24m0 192a88 88 0 1 1 88-88a88.1 88.1 0 0 1-88 88"
      />
    </CustomIcon>
  );
};
