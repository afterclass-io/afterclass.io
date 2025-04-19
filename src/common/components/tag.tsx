"use client";

import { cn } from "@/common/functions";
import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useState,
  type ComponentPropsWithoutRef,
  type HTMLProps,
  type ReactElement,
  type ReactNode,
} from "react";

export type TagProps = ComponentPropsWithoutRef<"div"> & {
  asChild?: boolean;
  defaultActive?: boolean;
  contentLeft?: React.ReactNode;
  contentRight?: React.ReactNode;
  clickable?: boolean;
  active?: boolean;
};

export const Tag = ({
  contentLeft,
  contentRight,
  children,
  defaultActive = false,
  className,
  asChild = false,
  clickable = false,
  active = false,
  ...props
}: TagProps) => {
  const [isActive, setIsActive] = useState(defaultActive);

  const StyledIcon = useCallback(
    ({ icon }: { icon: ReactNode }) => {
      if (isValidElement(icon)) {
        return Children.map(icon, (child) => {
          const originalClassName = (child.props as HTMLProps<HTMLOrSVGElement>)
            ?.className;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return cloneElement(child as ReactElement<any>, {
            // className: iconTheme({
            //   size,
            //   className: originalClassName, // overriding icon classNames
            // }),
          });
        });
      }
      return <></>;
    },
    [
      // size,
      // iconTheme,
    ],
  );

  const Child = useCallback(() => {
    if (asChild) {
      return children;
    }
    return (
      <>
        <StyledIcon icon={contentLeft} />
        {children && <span>{children}</span>}
        <StyledIcon icon={contentRight} />
      </>
    );
  }, [StyledIcon, contentLeft, contentRight, children, asChild]);

  return (
    <div
      className={cn(
        "border-border-default transition-color inline-flex min-w-14",
        "items-center justify-center gap-2 rounded-[6.1875rem]",
        "border border-solid bg-transparent px-3 py-[0.38rem]",
        className,
      )}
      onClick={clickable ? () => setIsActive((prev) => !prev) : undefined}
      {...props}
    >
      <Child />
    </div>
  );
};
