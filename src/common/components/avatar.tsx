"use client";

import * as React from "react";
import Image, { type ImageProps } from "next/image";

import { cn } from "@/common/functions";

type ImageStatus = "loading" | "loaded" | "error";

const AvatarContext = React.createContext<{
  status: ImageStatus;
  setStatus: (status: ImageStatus) => void;
} | null>(null);

function useAvatar() {
  const context = React.useContext(AvatarContext);
  if (!context) {
    throw new Error("Avatar parts must be used within an Avatar.");
  }
  return context;
}

function Avatar({ className, ...props }: React.ComponentProps<"span">) {
  const [status, setStatus] = React.useState<ImageStatus>("loading");
  const value = React.useMemo(() => ({ status, setStatus }), [status]);

  return (
    <AvatarContext.Provider value={value}>
      <span
        data-slot="avatar"
        className={cn(
          "relative flex size-8 shrink-0 overflow-hidden rounded-full",
          className,
        )}
        {...props}
      />
    </AvatarContext.Provider>
  );
}

type AvatarImageProps = Omit<
  ImageProps,
  "src" | "width" | "height" | "alt" | "fill"
> & {
  src?: string | null;
  alt: string;
  /** Rendered edge length in CSS pixels. The avatar is square. */
  size: number;
};

/**
 * Served through the Next.js image optimiser: modern format, sized for the
 * container, with `size` reserving the space before the file arrives. The
 * initials in `AvatarFallback` show until the image loads, and again when
 * there is no `src` or the file fails to load.
 */
function AvatarImage({
  className,
  src,
  alt,
  size,
  onLoad,
  onError,
  ...props
}: AvatarImageProps) {
  const { status, setStatus } = useAvatar();

  if (!src || status === "error") return null;

  return (
    <Image
      data-slot="avatar-image"
      src={src}
      alt={alt}
      width={size}
      height={size}
      onLoad={(event) => {
        setStatus("loaded");
        onLoad?.(event);
      }}
      onError={(event) => {
        setStatus("error");
        onError?.(event);
      }}
      className={cn("absolute inset-0 size-full object-cover", className)}
      {...props}
    />
  );
}

function AvatarFallback({ className, ...props }: React.ComponentProps<"span">) {
  const { status } = useAvatar();

  if (status === "loaded") return null;

  return (
    <span
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
