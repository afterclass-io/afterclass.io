import { CustomIcon, type CustomIconProps } from "./custom-icon";

export const ArrowFatLineUpIcon = (props: CustomIconProps) => {
  return (
    <CustomIcon viewBox="0 0 256 256" {...props}>
      <path
        fill="currentColor"
        d="m229.66 114.34l-96-96a8 8 0 0 0-11.32 0l-96 96A8 8 0 0 0 32 128h40v56a8 8 0 0 0 8 8h96a8 8 0 0 0 8-8v-56h40a8 8 0 0 0 5.66-13.66M176 112a8 8 0 0 0-8 8v56H88v-56a8 8 0 0 0-8-8H51.31L128 35.31L204.69 112Zm8 104a8 8 0 0 1-8 8H80a8 8 0 0 1 0-16h96a8 8 0 0 1 8 8"
      />
    </CustomIcon>
  );
};
