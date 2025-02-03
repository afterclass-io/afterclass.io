import { CustomIcon, type CustomIconProps } from "./CustomIcon";

export const PurpleHeartEmoji = (props: CustomIconProps) => {
  return (
    <CustomIcon viewBox="0 0 36 36" fill="none" {...props}>
      <path
        fill="#aa8ed6"
        d="M35.885 11.833c0-5.45-4.418-9.868-9.867-9.868c-3.308 0-6.227 1.633-8.018 4.129c-1.791-2.496-4.71-4.129-8.017-4.129c-5.45 0-9.868 4.417-9.868 9.868c0 .772.098 1.52.266 2.241C1.751 22.587 11.216 31.568 18 34.034c6.783-2.466 16.249-11.447 17.617-19.959c.17-.721.268-1.469.268-2.242"
      ></path>
    </CustomIcon>
  );
};
