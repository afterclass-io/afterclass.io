import { type ComponentPropsWithoutRef } from "react";
import { Heading } from "@/common/components/heading";
import { cn } from "@/common/functions";

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
    <div
      {...wrapperProps}
      className="inline-flex items-center gap-3 pb-2 md:gap-6"
    >
      {contentLeft}
      <Heading
        className={cn("text-center text-lg md:text-3xl", className)}
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
