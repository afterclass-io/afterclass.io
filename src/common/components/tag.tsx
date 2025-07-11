// https://supercharged-shadcn-components.dykennethryan.com/docs/components/chip
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/common/functions";

const tagVariants = cva(
  "inline-flex items-center select-none appearance-none rounded-md font-medium text-sm text-white transition-[background-color] data-[clickable=true]:cursor-pointer",
  {
    compoundVariants: [
      // Default color
      {
        variant: "filled",
        color: "default",
        className:
          "bg-foreground/90 dark:bg-foreground text-accent data-[clickable=true]:hover:bg-foreground/65",
      },
      {
        variant: "outline",
        color: "default",
        className:
          "text-foreground border-foreground border data-[clickable=true]:hover:bg-muted-foreground/10",
      },
      {
        variant: "soft",
        color: "default",
        className:
          "text-foreground dark:bg-accent/35 bg-accent data-[clickable=true]:hover:bg-foreground/15 dark:data-[clickable=true]:hover:bg-accent/65",
      },
      // Primary color
      {
        variant: "filled",
        color: "primary",
        className: "bg-primary data-[clickable=true]:hover:bg-primary/80",
      },
      {
        variant: "outline",
        color: "primary",
        className:
          "text-primary border-primary border data-[clickable=true]:hover:bg-primary/5",
      },
      {
        variant: "soft",
        color: "primary",
        className:
          "text-primary bg-primary/15 data-[clickable=true]:hover:bg-primary/35",
      },
      // Secondary color
      {
        variant: "filled",
        color: "secondary",
        className: "bg-secondary data-[clickable=true]:hover:bg-secondary/80",
      },
      {
        variant: "outline",
        color: "secondary",
        className:
          "text-secondary border-secondary border data-[clickable=true]:hover:bg-secondary/5",
      },
      {
        variant: "soft",
        color: "secondary",
        className:
          "text-secondary bg-secondary/15 data-[clickable=true]:hover:bg-secondary/35",
      },
      // Info color
      {
        variant: "filled",
        color: "info",
        className: "text-white bg-info data-[clickable=true]:hover:bg-info/90",
      },
      {
        variant: "outline",
        color: "info",
        className:
          "text-info border-info border data-[clickable=true]:hover:bg-info/5",
      },
      {
        variant: "soft",
        color: "info",
        className:
          "text-info bg-info/15 data-[clickable=true]:hover:bg-info/35",
      },
      // Success color
      {
        variant: "filled",
        color: "success",
        className:
          "text-white bg-success data-[clickable=true]:hover:bg-success/90",
      },
      {
        variant: "outline",
        color: "success",
        className:
          "text-success border-success border data-[clickable=true]:hover:bg-success/5",
      },
      {
        variant: "soft",
        color: "success",
        className:
          "text-success bg-success/15 data-[clickable=true]:hover:bg-success/35",
      },
      // Warning color
      {
        variant: "filled",
        color: "warning",
        className:
          "text-white bg-warning data-[clickable=true]:hover:bg-warning/90",
      },
      {
        variant: "outline",
        color: "warning",
        className:
          "text-warning border-warning border data-[clickable=true]:hover:bg-warning/5",
      },
      {
        variant: "soft",
        color: "warning",
        className:
          "text-warning bg-warning/15 data-[clickable=true]:hover:bg-warning/35",
      },
      // Error color
      {
        variant: "filled",
        color: "error",
        className:
          "text-white bg-error data-[clickable=true]:hover:bg-error/90",
      },
      {
        variant: "outline",
        color: "error",
        className:
          "text-error border-error border data-[clickable=true]:hover:bg-error/5",
      },
      {
        variant: "soft",
        color: "error",
        className:
          "text-error bg-error/15 data-[clickable=true]:hover:bg-error/35",
      },
    ],
    variants: {
      variant: {
        filled: "",
        outline: "bg-transparent",
        soft: "",
      },
      color: {
        default: "",
        primary: "",
        secondary: "",
        info: "",
        success: "",
        warning: "",
        error: "",
      },
      size: {
        xs: "h-5 [&>.label]:px-1.5 [&>.label]:text-xs [&>.start-icon]:size-3 [&>.start-icon>span]:size-3 [&>.start-icon>svg]:size-3 [&>.start-icon]:ml-0.5 [&>.start-icon]:-mr-1 [&>.deletable]:mr-0.5 [&>.deletable]:-ml-1",
        sm: "h-6 [&>.label]:px-2 [&>.start-icon]:size-5 [&>.start-icon>span]:size-5 [&>.start-icon>svg]:size-5 [&>.start-icon]:ml-0.5 [&>.start-icon]:-mr-1 [&>.deletable]:mr-0.5 [&>.deletable]:-ml-1",
        md: "h-8 [&>.label]:px-3 [&>.start-icon]:size-6 [&>.start-icon>span]:size-6 [&>.start-icon>svg]:size-6 [&>.start-icon]:ml-1 [&>.start-icon]:-mr-1.5 [&>.deletable]:mr-1 [&>.deletable]:-ml-1.5",
      },
    },
    defaultVariants: {
      color: "default",
      variant: "filled",
      size: "md",
    },
  },
);

const deletableVariants = cva(
  "cursor-pointer rounded-full flex items-center justify-center transition-[background-color] [&_svg]:text-current size-4 [&_svg]:size-2.5",
  {
    variants: {
      variant: {
        filled:
          "data-[variant=filled]:bg-white/45 data-[variant=filled]:hover:bg-white/80",
        outline: "text-accent",
        soft: "text-accent",
      },
      color: {
        default:
          "data-[variant=filled]:bg-accent/80 data-[variant=filled]:hover:bg-accent data-[variant=filled]:text-foreground bg-foreground/65 hover:bg-foreground",
        primary:
          "data-[variant=filled]:text-primary bg-primary/65 hover:bg-primary",
        secondary:
          "data-[variant=filled]:text-secondary bg-secondary/65 hover:bg-secondary",
        info: "data-[variant=filled]:text-info bg-info/65 hover:bg-info",
        success:
          "data-[variant=filled]:text-success bg-success/65 hover:bg-success",
        warning:
          "data-[variant=filled]:text-warning bg-warning/65 hover:bg-warning",
        error: "data-[variant=filled]:text-error bg-error/65 hover:bg-error",
      },
    },
    defaultVariants: {
      color: "default",
      variant: "filled",
    },
  },
);

export interface TagProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "color">,
    VariantProps<typeof tagVariants> {
  size?: "xs" | "sm" | "md";
  deletable?: boolean;
  avatar?: React.JSX.Element;
  deleteIcon?: React.JSX.Element;
}

function Tag({
  children,
  variant = "filled",
  size = "md",
  color = "default",
  avatar,
  deletable = true,
  deleteIcon,
  onClick,
  className,
}: TagProps) {
  return (
    <div
      className={cn(tagVariants({ variant, color, className, size }))}
      data-clickable={!!onClick}
      onClick={onClick}
    >
      {!!avatar && <div className="start-icon">{avatar}</div>}
      <div className="label align-middle">{children}</div>
      {!!deletable && (
        <div
          className={cn(deletableVariants({ variant, color }), "deletable")}
          data-variant={variant}
          data-color={color}
        >
          {deleteIcon ?? <X strokeWidth={3} />}
        </div>
      )}
    </div>
  );
}

export { Tag };
