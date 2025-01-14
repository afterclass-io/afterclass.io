"use client";

import type { ReactNode } from "react";

import { Button } from "@/common/components/Button";

export interface GoogleSignInButtonProps {
  children: ReactNode;
}

export const GoogleSignInButton = ({ children }: GoogleSignInButtonProps) => {
  const handleGoogleSignIn = () => {
  };

  return (
    <Button
      fullWidth
      type="button"
      isResponsive
      onClick={handleGoogleSignIn}
      tabIndex={4}
    >
      {children}
    </Button>
  );
};
