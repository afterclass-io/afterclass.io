"use client";
import useUmami from "@/common/hooks/use-umami";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export const UmamiIdentityTracker = () => {
  const umami = useUmami();
  const { data: session } = useSession();

  useEffect(() => {
    if (session) {
      umami.identify({ ...session.user });
    }
  }, [session]);

  return null;
};
