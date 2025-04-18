import Link from "next/link";
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  useCallback,
  isValidElement,
  Children,
  type HTMLProps,
  cloneElement,
  type ReactElement,
  forwardRef,
} from "react";

import {
  buttonIconTheme,
  buttonTheme,
  type ButtonVariants,
} from "./Button.theme";
import { Spinner } from "@/common/components/CustomIcon";

export interface ButtonBaseProps {
  disabled?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  isResponsive?: boolean;
  asChild?: boolean;
}

export interface ButtonLinkProps extends ComponentPropsWithoutRef<typeof Link> {
  as?: "a";
  external?: false;
}

export interface ButtonAnchorProps extends ComponentPropsWithoutRef<"a"> {
  as?: "a";
  external: true;
  href: string;
}

export interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
  as?: "button";
}

export type ButtonLinkOrAnchorProps = (ButtonLinkProps | ButtonAnchorProps) &
  ButtonBaseProps &
  Omit<ButtonVariants, "hasIcon" | "iconOnly">;

// Discriminated union based on "as" prop
export type ButtonOrLinkProps = (ButtonLinkOrAnchorProps | ButtonProps) &
  ButtonBaseProps &
  Omit<ButtonVariants, "hasIcon" | "iconOnly">;

export const Button = forwardRef<HTMLButtonElement, ButtonOrLinkProps>(
  (
    {
      children,
      iconLeft,
      iconRight,
      isResponsive = false,
      rounded,
      fullWidth,
      loading,
      asChild = false,
      ...props
    },
    ref,
  ) => {
    // Conditionally render between <NextLink>, <a> or <button> depending on props
    // useCallback to prevent unnecessary re-rendering
    const Component = useCallback(
      ({ children: _children, ..._props }: ButtonOrLinkProps) => {
        // Accessing .as instead of destructuring to make use of discriminated unions
        // https://github.com/microsoft/TypeScript/issues/46318
        if (_props.as === "a") {
          // External link
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { as, ...baseLinkOrAnchorProps } = _props;

          if (baseLinkOrAnchorProps.external) {
            // baseLinkOrAnchorProps is discriminated based on external prop
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { href, external, ...baseAnchorProps } =
              baseLinkOrAnchorProps;
            const externalLinkProps = {
              target: "_blank",
              rel: "noopener",
              href,
              ...baseAnchorProps,
            };
            return <a {...externalLinkProps}>{_children}</a>;
          }

          // baseLinkOrAnchorProps is discriminated based on external prop
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { href, external, ...baseLinkProps } = baseLinkOrAnchorProps;

          // Internal link
          return (
            <Link {...baseLinkProps} href={href}>
              {_children}
            </Link>
          );
        } else {
          const buttonProps = _props as ButtonProps;
          return (
            <button {...buttonProps} ref={ref}>
              {_children}
            </button>
          );
        }
      },
      [],
    );

    // Self invoking function to pick only props used in ButtonVariants
    const styleProps = (({
      variant = "primary",
      iconOnly,
      size = "md",
      as,
    }) => ({
      variant,
      iconOnly,
      size,
      as,
      rounded,
      fullWidth,
      loading,
    }))({
      ...props,
      iconOnly: typeof children === "undefined",
      hasIcon: !!iconLeft || !!iconRight,
    });

    // throw error to pass aria-label if button is icon only
    if (typeof children === "undefined" && !props["aria-label"]) {
      throw new Error(
        "Button must have a label if it is icon only. Please add an aria-label prop.",
      );
    }

    const StyledIcon = useCallback(
      ({ icon }: { icon: ReactNode }) => {
        if (isValidElement(icon)) {
          return Children.map(icon, (child) => {
            const originalClassName = (
              child.props as HTMLProps<HTMLOrSVGElement>
            )?.className;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return cloneElement(child as ReactElement<any>, {
              className: buttonIconTheme({
                size: styleProps?.size,
                iconOnly: typeof children === "undefined",
                className: originalClassName, // overriding icon classNames
              }),
            });
          });
        }
        return <></>;
      },
      [children, styleProps?.size],
    );

    const Child = useCallback(() => {
      if (asChild) {
        return children;
      }
      return (
        <>
          <StyledIcon icon={iconLeft} />
          {children && <span>{children}</span>}
          <StyledIcon icon={iconRight} />
        </>
      );
    }, [StyledIcon, iconLeft, iconRight, children, asChild]);

    const disableOnClickProp = {
      ...(loading && { onClick: undefined }),
    };

    return (
      <Component
        {...props}
        {...disableOnClickProp}
        className={buttonTheme({
          ...styleProps,
          ...(isResponsive && {
            size: { initial: "sm", md: "md" },
          }),
          className: props.className,
        })}
        data-disabled={props.disabled ? "" : undefined}
      >
        <Child />
        {loading && (
          <span className="loading absolute inset-0 grid place-content-center">
            <Spinner className="animate-spin" />
          </span>
        )}
      </Component>
    );
  },
);
Button.displayName = "Button";
