import type { Metadata } from "next";
import type { PropsWithChildren } from "react";

export const metadata: Metadata = {
  title: "Meetings",
  description: "Group meeting availability coordination for university students.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function MeetingsLayout({ children }: PropsWithChildren) {
  return <div className="meetings-theme">{children}</div>;
}
