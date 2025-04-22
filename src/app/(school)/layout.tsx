import { type PropsWithChildren } from "react";

export default async function SchoolLayout({ children }: PropsWithChildren) {
  return (
    <div className="mx-auto my-2 max-w-screen-lg p-4 md:my-4">{children}</div>
  );
}
