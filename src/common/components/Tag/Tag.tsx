"use client";

import { tagTheme, type TagVariants } from "./Tag.theme";
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

export type TagProps = ComponentPropsWithoutRef<"div"> &
  TagVariants & {
    asChild?: boolean;
    defaultActive?: boolean;
    contentLeft?: React.ReactNode;
    contentRight?: React.ReactNode;
  };

export const Tag = ({
  contentLeft,
  contentRight,
  children,
  defaultActive = false,
  active,
  clickable = false,
  size = "md",
  className,
  asChild = false,
  ...props
}: TagProps) => {
  const [isActive, setIsActive] = useState(defaultActive);
  const { tag, icon: iconTheme } = tagTheme({
    active: active ?? (clickable ? isActive : defaultActive),
    clickable,
    size,
  });

  const StyledIcon = useCallback(
    ({ icon }: { icon: ReactNode }) => {
      if (isValidElement(icon)) {
        return Children.map(icon, (child) => {
          const originalClassName = (child.props as HTMLProps<HTMLOrSVGElement>)
            ?.className;
          return cloneElement(child as ReactElement, {
            className: iconTheme({
              size,
              className: originalClassName, // overriding icon classNames
            }),
          });
        });
      }
      return <></>;
    },
    [size, iconTheme],
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
      className={tag({ className })}
      onClick={clickable ? () => setIsActive((prev) => !prev) : undefined}
      {...props}
    >
      <Child />
    </div>
  );
};
