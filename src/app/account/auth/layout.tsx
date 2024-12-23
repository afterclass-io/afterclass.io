import { type PropsWithChildren } from "react";

export default function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="my-2 flex flex-1 items-center justify-center p-4 md:my-8">
      {children}
    </div>
  );
}
