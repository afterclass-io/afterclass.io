import Link from "next/link";

import { buttonVariants } from "@/common/components/button";
import { cn } from "@/common/functions";
import { env } from "@/env";

type AuthCardProps<T extends React.ElementType = React.ElementType> = {
  as?: T;
  title?: string;
  children?: React.ReactNode;
};

const defaultElement = "h1";

type TitleProps<T extends React.ElementType> = AuthCardProps<T> &
  Omit<React.ComponentProps<T>, keyof AuthCardProps<T>>;

export const AuthCard = <T extends React.ElementType = typeof defaultElement>({
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
      <div className="text-muted-foreground">
        <span>Having trouble?</span>
        <Link
          href={env.NEXT_PUBLIC_AC_HELPDESK_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({
              variant: "link",
              className: "text-muted-foreground font-normal",
            }),
          )}
        >
          <span>Contact us on Telegram</span>
          <span className="text-primary">@afterclass</span>
        </Link>
      </div>
    </div>
  );
};

AuthCard.displayName = "AuthCard";
