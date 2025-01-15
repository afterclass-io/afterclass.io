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
      iconLeft={
        isLoading ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-4 w-4 animate-spin"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : undefined
      }
    >
      {children}
    </Button>
  );
};
