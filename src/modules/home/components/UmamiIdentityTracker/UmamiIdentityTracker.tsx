"use client";
import useUmami from "@/common/hooks/use-umami";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export const UmamiIdentityTracker = () => {
  const { identify } = useUmami();
  const { data: session } = useSession();

  useEffect(() => {
    if (session) {
      identify({ ...session.user });
    }
  }, [session, identify]);

  return null;
};
