import { CustomIcon, type CustomIconProps } from "./custom-icon";

interface RatingHeartProps extends CustomIconProps {
  fillPercentage?: number; // 0 to 1
}

export const HeartIcon = ({
  fillPercentage = 1,
  ...props
}: RatingHeartProps) => {
  const clipPathId = `heart-clip-${Math.random().toString(36).substr(2, 9)}`;
  return (
    <CustomIcon viewBox="0 0 24 24" fill="none" {...props}>
      {/* Define clip path for partial fill */}
      <defs>
        <clipPath id={clipPathId}>
          <rect x="0" y="0" width={24 * fillPercentage} height="24" />
        </clipPath>
      </defs>

      {/* Background heart (unfilled) */}
      <path
        d="M23.9233 7.88873C23.9233 4.25539 20.978 1.31006 17.3453 1.31006C15.14 1.31006 13.194 2.39873 12 4.06273C10.806 2.39873 8.85999 1.31006 6.65533 1.31006C3.02199 1.31006 0.0766602 4.25473 0.0766602 7.88873C0.0766602 8.40339 0.141993 8.90206 0.253993 9.38273C1.16733 15.0581 7.47733 21.0454 12 22.6894C16.522 21.0454 22.8327 15.0581 23.7447 9.38339C23.858 8.90273 23.9233 8.40406 23.9233 7.88873Z"
        fill="currentColor"
      />

      {/* Filled heart with clip path */}
      <path
        d="M23.9233 7.88873C23.9233 4.25539 20.978 1.31006 17.3453 1.31006C15.14 1.31006 13.194 2.39873 12 4.06273C10.806 2.39873 8.85999 1.31006 6.65533 1.31006C3.02199 1.31006 0.0766602 4.25473 0.0766602 7.88873C0.0766602 8.40339 0.141993 8.90206 0.253993 9.38273C1.16733 15.0581 7.47733 21.0454 12 22.6894C16.522 21.0454 22.8327 15.0581 23.7447 9.38339C23.858 8.90273 23.9233 8.40406 23.9233 7.88873Z"
        fill="#C1694F"
        clipPath={`url(#${clipPathId})`}
      />
    </CustomIcon>
  );
};
