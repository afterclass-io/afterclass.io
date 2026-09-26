"use client";

import { useState } from "react";
import Image from "next/image";

interface Props {
  photoUrl?: string | null;
  fallback: string;
}

/**
 * Navbar avatar. The 24px box is fixed either way, so the space is reserved
 * before the image loads and a missing/failed image falls back to initials
 * with no shift.
 */
export const UserAvatar = ({ photoUrl, fallback }: Props) => {
  const [failed, setFailed] = useState(false);

  if (!photoUrl || failed) {
    return (
      <div className="bg-muted flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full text-center">
        {fallback}
      </div>
    );
  }

  return (
    <Image
      src={photoUrl}
      alt=""
      width={24}
      height={24}
      onError={() => setFailed(true)}
      className="size-6 shrink-0 rounded-full object-cover"
    />
  );
};
