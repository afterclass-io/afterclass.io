import { type PropsWithChildren } from "react";

export default async function SchoolLayout({ children }: PropsWithChildren) {
  // Full-width shell: pages that need the classic 954px centered column
  // (reviews, bidding, search, submit) opt back in via ConstrainedContainer.
  return <div className="my-1 w-full p-2 md:my-4 md:px-4">{children}</div>;
}
