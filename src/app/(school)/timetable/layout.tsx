import type { Metadata } from "next";
import type { PropsWithChildren } from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function TimetableLayout({ children }: PropsWithChildren) {
  return children;
}
