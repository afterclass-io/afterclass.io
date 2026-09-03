"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { getImageProps } from "next/image";

import { cn } from "@/common/functions";

// Intrinsic size of the optimized avatar (#522): 2x of the largest displayed
// size (default avatar root is size-8 = 32px). The optimizer serves AVIF/WebP
// per next.config images.formats.
const AVATAR_INTRINSIC_SIZE = 64;

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className,
      )}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  src,
  alt,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  // Route through next/image's optimizer instead of the identity provider's
  // unconstrained original (#522). srcSet is deliberately dropped: Radix
  // preloads `src` with a bare `new Image()`, so a single optimized request
  // at the intrinsic size is the only fetch. Fallback initials still show on
  // error, driven by Radix's imageLoadingStatus context.
  const optimized =
    typeof src === "string"
      ? getImageProps({
          src,
          alt: alt ?? "",
          width: AVATAR_INTRINSIC_SIZE,
          height: AVATAR_INTRINSIC_SIZE,
        }).props
      : undefined;
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      src={optimized?.src}
      width={optimized?.width}
      height={optimized?.height}
      alt={alt}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
