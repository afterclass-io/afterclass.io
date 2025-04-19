import { type ComponentPropsWithoutRef } from "react";
import { Heading } from "@/common/components/heading";

export type PageTitleProps = ComponentPropsWithoutRef<"div"> & {
  children: React.ReactNode;
  contentLeft?: React.ReactNode;
  contentRight?: React.ReactNode;
  wrapperProps?: ComponentPropsWithoutRef<"div">;
};

export const PageTitle = ({
  children,
  contentLeft,
  contentRight,
  wrapperProps,
  className,
  ...props
}: PageTitleProps) => {
  return (
    <div {...wrapperProps} className="inline-flex items-center pb-2">
      {contentLeft}
      <Heading
        className="text-center"
        as="h1"
        {...props}
        data-test="page-title"
      >
        {children}
      </Heading>
      {contentRight}
    </div>
  );
};
