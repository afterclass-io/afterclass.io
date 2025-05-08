import { CustomIcon, type CustomIconProps } from "./custom-icon";

export const ClipboardIcon = (props: CustomIconProps) => {
  return (
    <CustomIcon
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      {...props}
    >
      <path
        fill="#c1694f"
        d="M32 34a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h24a2 2 0 0 1 2 2z"
      />
      <path
        fill="#fff"
        d="M29 32a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h20a1 1 0 0 1 1 1z"
      />
      <path
        fill="#ccd6dd"
        d="M25 3h-4a3 3 0 1 0-6 0h-4a2 2 0 0 0-2 2v5h18V5a2 2 0 0 0-2-2"
      />
      <circle cx="18" cy="3" r="2" fill="#292f33" />
      <path
        fill="#99aab5"
        d="M20 14a1 1 0 0 1-1 1h-9a1 1 0 0 1 0-2h9a1 1 0 0 1 1 1m7 4a1 1 0 0 1-1 1H10a1 1 0 0 1 0-2h16a1 1 0 0 1 1 1m0 4a1 1 0 0 1-1 1H10a1 1 0 1 1 0-2h16a1 1 0 0 1 1 1m0 4a1 1 0 0 1-1 1H10a1 1 0 1 1 0-2h16a1 1 0 0 1 1 1m0 4a1 1 0 0 1-1 1h-9a1 1 0 1 1 0-2h9a1 1 0 0 1 1 1"
      />
    </CustomIcon>
  );
};
