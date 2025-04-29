import { type PropsWithChildren } from "react";

export default async function SchoolLayout({ children }: PropsWithChildren) {
  return (
    <div className="mx-auto my-1 max-w-[954px] p-2 md:my-4">{children}</div>
  );
}
