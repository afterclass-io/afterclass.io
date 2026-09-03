import type { Metadata } from "next";
import type { PropsWithChildren } from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="my-2 flex flex-1 items-center justify-center p-4 md:my-8">
      {children}
    </div>
  );
}
