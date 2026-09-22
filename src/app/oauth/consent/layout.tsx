import { type Metadata } from "next";
import { type PropsWithChildren } from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  // `authorization_id` identifies one consent request, not a page of its own.
  alternates: { canonical: "/oauth/consent" },
};

export default function OAuthConsentLayout({ children }: PropsWithChildren) {
  return children;
}
