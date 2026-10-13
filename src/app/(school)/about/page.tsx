import { type Metadata } from "next";
import Link from "next/link";

import { PolicySection } from "@/common/components/policy-section";

export const metadata: Metadata = {
  title: "About AfterClass",
  description:
    "AfterClass helps SMU students explore course reviews, plan courses and timetables, and coordinate group meetings.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-prose px-4 py-10">
      <h1 className="text-2xl font-bold">AfterClass</h1>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        AfterClass is a student-run course planning site for Singapore
        Management University students. We help students make informed course
        choices and organise their academic schedules.
      </p>

      <PolicySection title="What you can do with AfterClass">
        <p>
          Explore student reviews of courses and professors, understand bidding
          results, plan course bids, build term timetables and degree roadmaps,
          and coordinate group meeting availability.
        </p>
        <p>
          You can browse public information without signing in. Sign in to save
          your plans, contribute reviews, and submit your meeting availability.
        </p>
      </PolicySection>

      <PolicySection title="Why we request Google access">
        <p>
          Google sign-in lets you use your university Google account to access
          AfterClass. We use your account information to identify you and
          maintain your AfterClass account.
        </p>
        <p>
          Connecting Google Calendar is optional and separate from signing in.
          When you choose Calendar sync in a meeting, we request read-only
          access to your Calendar events to show busy periods and help you
          choose available times. AfterClass does not create, edit, or delete
          Google Calendar events.
        </p>
        <p>
          Calendar events are read directly in your browser. If you save your
          meeting availability, your selected time slots are stored in the
          meeting poll; your Calendar event titles are not submitted with them.
          You can also enter availability manually without connecting Google
          Calendar.
        </p>
      </PolicySection>

      <PolicySection title="Privacy and support">
        <p>
          Read our{" "}
          <Link href="/privacy" className="text-primary underline">
            privacy policy
          </Link>{" "}
          for how we access, use, store, and share data, and our{" "}
          <Link href="/terms" className="text-primary underline">
            terms of service
          </Link>{" "}
          for using AfterClass.
        </p>
        <p>
          Contact us at{" "}
          <a
            href="mailto:helloafterclass@gmail.com"
            className="text-primary underline"
          >
            helloafterclass@gmail.com
          </a>
          .
        </p>
        <p>
          <Link href="/" className="text-primary underline">
            Explore AfterClass
          </Link>
        </p>
      </PolicySection>
    </main>
  );
}
