import { CustomIcon, type CustomIconProps } from "./custom-icon";

export const ClockIcon = (props: CustomIconProps) => {
  return (
    <CustomIcon
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      {...props}
    >
      <circle cx={18} cy={18} r={18} fill="#99aab5"></circle>
      <circle cx={18} cy={18} r={14} fill="#e1e8ed"></circle>
      <path fill="#66757f" d="M19 18a1 1 0 1 1-2 0V7a1 1 0 0 1 2 0z"></path>
      <path
        fill="#66757f"
        d="M26.66 23a1 1 0 0 1-1.365.367l-7.795-4.5a.999.999 0 1 1 1-1.732l7.795 4.5A1 1 0 0 1 26.66 23"
      />
    </CustomIcon>
  );
};
