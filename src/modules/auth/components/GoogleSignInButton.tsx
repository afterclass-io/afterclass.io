"use client";

import { useState, type ReactNode } from "react";
import {
  signIn,
  type SignInResponse,
  type SignInOptions,
} from "next-auth/react";

import { Button } from "@/common/components/Button";

export interface GoogleSignInButtonProps {
  googleSignInOptions?: SignInOptions;
  onResponse?: (signInResponse?: SignInResponse) => void;
  onError?: (error: unknown) => void;
  onLoading?: (loading: boolean) => void;
  children: ReactNode;
}

export const GoogleSignInButton = ({
  children,
  googleSignInOptions,
  onResponse,
  onError,
  onLoading,
}: GoogleSignInButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      if (onLoading) {
        onLoading(true);
      }
      const signinResp = await signIn("google", googleSignInOptions);

      if (onResponse) {
        onResponse(signinResp);
      }
    } catch (err) {
      if (onError) {
        onError(err);
      }
    } finally {
      setIsLoading(false);
      if (onLoading) {
        onLoading(false);
      }
    }
  };

  return (
    <Button
      fullWidth
      type="button"
      isResponsive
      onClick={handleGoogleSignIn}
      tabIndex={4}
      disabled={isLoading}
      loading={isLoading}
    >
      {children}
    </Button>
  );
};
