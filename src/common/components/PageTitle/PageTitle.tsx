import { type ComponentPropsWithoutRef } from "react";
import Heading from "@/common/components/Heading";
import { pageTitleTheme } from "./PageTitle.theme";

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
  const { wrapper, heading } = pageTitleTheme({
    size: { initial: "sm", md: "md" },
  });
  return (
    <div
      {...wrapperProps}
      className={wrapper({ className: wrapperProps?.className })}
    >
      {contentLeft}
      <Heading
        className={heading({ className })}
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
