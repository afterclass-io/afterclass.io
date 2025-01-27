import { CustomIcon, type CustomIconProps } from "./CustomIcon";

export const ArrowUpIcon = (props: CustomIconProps) => {
  return (
    <CustomIcon viewBox="0 0 256 256" {...props}>
      <path
        fill="currentColor"
        d="M205.66 117.66a8 8 0 0 1-11.32 0L136 59.31V216a8 8 0 0 1-16 0V59.31l-58.34 58.35a8 8 0 0 1-11.32-11.32l72-72a8 8 0 0 1 11.32 0l72 72a8 8 0 0 1 0 11.32"
      ></path>
    </CustomIcon>
  );
};
