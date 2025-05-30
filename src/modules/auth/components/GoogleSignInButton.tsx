"use client";

import { useState, type ReactNode } from "react";
import {
  signIn,
  type SignInResponse,
  type SignInOptions,
} from "next-auth/react";

import { Button } from "@/common/components/button";
import { Loader2 } from "lucide-react";

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
      const signinResp = (await signIn(
        "google",
        googleSignInOptions,
      )) as unknown as SignInResponse;

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
      type="button"
      className="w-full"
      onClick={handleGoogleSignIn}
      tabIndex={4}
      disabled={isLoading}
      data-umami-event="signin-with-google"
    >
      {isLoading && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
};
