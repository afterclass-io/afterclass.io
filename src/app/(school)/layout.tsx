import { type PropsWithChildren } from "react";

export default async function SchoolLayout({ children }: PropsWithChildren) {
  return (
    <div className="mx-auto my-1 max-w-screen-lg p-2 md:my-4">{children}</div>
  );
}
