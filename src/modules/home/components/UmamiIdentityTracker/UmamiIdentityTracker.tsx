"use client";
import useUmami from "@/common/hooks/use-umami";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

// Send the opaque user id only. Email, names and Telegram handle are student
// data and must never reach the analytics server.
export const UmamiIdentityTracker = () => {
  const { identify } = useUmami();
  const { data: session } = useSession();
  const userId = session?.user.id;

  useEffect(() => {
    if (userId) {
      identify({ userId });
    }
  }, [userId, identify]);

  return null;
};
