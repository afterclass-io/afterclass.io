"use client";

import { useMemo, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, LogIn } from "lucide-react";
import { cn } from "@/common/functions";
import { Button } from "@/common/components/button";
import { EmptyState } from "@/common/components/empty-state";

type AuthWallVariant = "full" | "card" | "compact" | "inline" | "overlay";

export interface AuthWallProps {
  /**
   * Sizing and layout context:
   * - `full`: Standard page/view replacement with EmptyState-style layout.
   * - `card`: Contained box for dashboard grids, sidebars, or sub-sections.
   * - `compact`: Low-profile banner for tight panels or embedded toolbars.
   * - `inline`: Text/badge inline trigger for lists or metadata items.
   * - `overlay`: Absolute positioning over blurred content.
   */
  variant?: AuthWallVariant;
  /** Name of the gated feature/asset, e.g. "bidding analytics", "your timetable", "ratings". */
  feature?: string;
  /** Explicit title override. Defaults to "Sign in to view {feature}" or "Sign in required". */
  title?: string;
  /** Concise microcopy. Omit for clean zero-filler presentation. */
  description?: string;
  /** Button label. Defaults to "Sign in". */
  ctaLabel?: string;
  /** Explicit return URL. If omitted, automatically derived from usePathname + useSearchParams. */
  callbackUrl?: string;
  /** Custom icon override. */
  icon?: ReactNode;
  /** Optional click interceptor prior to sign-in navigation. */
  onSignIn?: () => void;
  className?: string;
}

export function AuthWall({
  variant = "full",
  feature,
  title,
  description,
  ctaLabel = "Sign in",
  callbackUrl,
  icon,
  onSignIn,
  className,
}: AuthWallProps) {
  const pathname = usePathname();
  let searchParams: { toString: () => string } | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    searchParams = useSearchParams();
  } catch {
    searchParams = null;
  }

  // Automatic callbackUrl derivation preserving query parameters (e.g. ?course=CS101 or ?view=mine)
  const loginHref = useMemo(() => {
    if (callbackUrl) {
      return `/account/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    }
    if (!pathname) {
      return "/account/auth/login";
    }
    const qs = searchParams?.toString();
    const full = qs ? `${pathname}?${qs}` : pathname;
    return `/account/auth/login?callbackUrl=${encodeURIComponent(full)}`;
  }, [callbackUrl, pathname, searchParams]);

  const resolvedTitle =
    title ?? (feature ? `Sign in to view ${feature}` : "Sign in required");

  // Variant: overlay
  if (variant === "overlay") {
    return (
      <div
        className={cn(
          "bg-card/80 absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-[inherit] p-4 text-center backdrop-blur-md",
          className,
        )}
        data-test="auth-wall-overlay"
      >
        <div className="text-muted-foreground">
          {icon ?? <Lock className="size-5" />}
        </div>
        <p className="text-sm font-medium">{resolvedTitle}</p>
        <Button
          size="sm"
          asChild
          onClick={onSignIn}
          className="h-8 px-3 text-xs"
        >
          <Link href={loginHref}>{ctaLabel}</Link>
        </Button>
      </div>
    );
  }

  // Variant: inline
  if (variant === "inline") {
    return (
      <span
        className={cn(
          "text-muted-foreground inline-flex items-center gap-1.5 text-xs",
          className,
        )}
        data-test="auth-wall-inline"
      >
        <Lock className="size-3.5" />
        <span>{resolvedTitle}</span>
        <Button
          variant="link"
          size="sm"
          asChild
          onClick={onSignIn}
          className="h-auto p-0 text-xs"
        >
          <Link href={loginHref}>{ctaLabel}</Link>
        </Button>
      </span>
    );
  }

  // Variant: compact (tight toolbars, drawers, course search panel)
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "border-border bg-muted/20 flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed p-4 text-center",
          className,
        )}
        data-test="auth-wall-compact"
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          {icon ?? <Lock className="text-muted-foreground size-4" />}
          <span>{resolvedTitle}</span>
        </div>
        {description && (
          <p className="text-muted-foreground text-xs">{description}</p>
        )}
        <Button
          size="sm"
          asChild
          onClick={onSignIn}
          className="mt-1 h-7 text-xs"
        >
          <Link href={loginHref}>{ctaLabel}</Link>
        </Button>
      </div>
    );
  }

  // Variant: card (embedded grid cards, section panels)
  if (variant === "card") {
    return (
      <div
        className={cn(
          "border-border bg-card/40 flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center",
          className,
        )}
        data-test="auth-wall-card"
      >
        <div className="text-muted-foreground">
          {icon ?? <Lock className="size-6" />}
        </div>
        <p className="text-base font-semibold">{resolvedTitle}</p>
        {description && (
          <p className="text-muted-foreground max-w-sm text-xs">
            {description}
          </p>
        )}
        <Button size="sm" asChild onClick={onSignIn} className="mt-2">
          <Link href={loginHref}>{ctaLabel}</Link>
        </Button>
      </div>
    );
  }

  // Variant: full (default, page/tab-level replacement)
  return (
    <EmptyState
      className={cn("min-h-[360px] p-8", className)}
      icon={icon ?? <LogIn className="size-8" />}
      title={resolvedTitle}
      description={
        description ?? "Sign in with your university account to continue."
      }
      action={
        <Button asChild onClick={onSignIn}>
          <Link href={loginHref}>{ctaLabel}</Link>
        </Button>
      }
    />
  );
}
