import { type ComponentProps, type ElementType, type ReactNode } from "react";

type AuthCardProps<T extends ElementType = ElementType> = {
  as?: T;
  title?: string;
  children?: ReactNode;
};

const defaultElement = "h1";

type TitleProps<T extends ElementType> = AuthCardProps<T> &
  Omit<ComponentProps<T>, keyof AuthCardProps<T>>;

export const AuthCard = <T extends ElementType = typeof defaultElement>({
  children,
  title,
  as,
  ...rest
}: TitleProps<T>) => {
  const Title = as ?? defaultElement;
  return (
    <div className="bg-card flex max-w-screen-sm flex-[1_0_0] flex-col items-start gap-6 rounded-2xl p-5 md:p-12">
      <Title
        className="text-accent-foreground text-xl font-semibold md:text-3xl"
        {...rest}
      >
        {title}
      </Title>
      {children}
    </div>
  );
};

AuthCard.displayName = "AuthCard";
