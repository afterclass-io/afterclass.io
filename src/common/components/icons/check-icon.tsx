import { CustomIcon, type CustomIconProps } from "./custom-icon";

export const CheckIcon = (props: CustomIconProps) => {
  return (
    <CustomIcon viewBox="0 0 15 16" {...props}>
      <rect width="15" height="15" transform="translate(0 0.5)" fill="none" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.4669 4.22684C11.7558 4.41574 11.8369 4.80308 11.648 5.09198L7.39799 11.592C7.29783 11.7452 7.13556 11.8467 6.95402 11.8699C6.77247 11.8931 6.58989 11.8355 6.45446 11.7124L3.70446 9.21241C3.44905 8.98022 3.43023 8.58494 3.66242 8.32953C3.89461 8.07412 4.28989 8.05529 4.5453 8.28749L6.75292 10.2944L10.6018 4.40792C10.7907 4.11902 11.178 4.03795 11.4669 4.22684Z"
        fill="currentColor"
      />
    </CustomIcon>
  );
};
