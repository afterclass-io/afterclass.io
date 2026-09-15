import { type Metadata } from "next";
import { type PropsWithChildren } from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  // `acadTermId` narrows the timetable view, so it is dropped.
  alternates: { canonical: "/timetable" },
};

export default function TimetableLayout({ children }: PropsWithChildren) {
  return children;
}
