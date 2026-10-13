import { type Metadata } from "next";
import Link from "next/link";

import { PolicySection } from "@/common/components/policy-section";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "AfterClass privacy policy: what data we collect, AI processor sharing, storage, and your rights.",
};

export const revalidate = 86400;

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-prose px-4 py-10">
      <h1 className="text-2xl font-bold">Privacy Policy</h1>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        AfterClass is a student-run course planning site for Singapore
        Management University students. This policy explains what we collect,
        who we share it with, and your rights — written for Singapore&apos;s
        PDPA first. Exchange and other non-SG users get the same handling; if
        that changes we will say so here. See also our{" "}
        <Link
          href="/terms"
          className="text-primary underline-offset-4 hover:underline"
        >
          terms of service
        </Link>
        . Learn more{" "}
        <Link
          href="/about"
          className="text-primary underline-offset-4 hover:underline"
        >
          about AfterClass
        </Link>
        .
      </p>

      <PolicySection title="Data we collect">
        <p>
          <span className="text-foreground">Account data:</span> your name,
          email, username, faculty, and university, which you provide when you
          sign up with your school email. When you sign in with Google, we
          receive your email, name, profile picture, and account identifier to
          identify you, verify your university account, and create or link your
          AfterClass account. Our authentication provider, Supabase, processes
          your Google identity token to establish your account session.
        </p>
        <p>
          <span className="text-foreground">Activity data:</span> the
          timetables, bids, roadmaps, and reviews you create or view, plus basic
          usage records that keep the site running (for example message quotas
          and spend accounting).
        </p>
        <p>
          <span className="text-foreground">
            AI data (only when you use the AI assistant):
          </span>{" "}
          your message plus relevant slices of your timetable, bids, and
          roadmap, the page you are on, and public catalog or review snippets.
          AI turns never include passwords, login tokens, or private notes. Note
          that review bodies and the names you give your timetables are free
          text, so avoid putting personal details in them.
        </p>
      </PolicySection>

      <PolicySection title="Google Calendar and meeting availability">
        <p>
          Calendar sync is optional. When you select it in a meeting, we request
          read-only access using the Google Calendar permission
          calendar.events.readonly. We read events from your primary calendar
          for the meeting&apos;s date range, including event identifiers,
          titles, start and end times, whether an event is marked free or busy,
          and your own attendance response. These fields help us display busy
          periods and suggest available meeting times. We cannot create, edit,
          or delete your Google Calendar events through this integration.
        </p>
        <p>
          Your browser requests events directly from Google using a temporary
          access token. This integration does not persist the Calendar access
          token or raw events in our database or browser storage. The Calendar
          overlay stays in memory while the meeting view is open. Closing or
          reloading the view clears the overlay but does not revoke
          Google&apos;s permission grant. Hiding the Calendar overlay only
          changes its visibility in the meeting view.
        </p>
        <p>
          If you autofill availability from your calendars and then save it,
          AfterClass stores the available and if-needed time slots you submit in
          the meeting poll. That availability is used to coordinate the meeting
          and is visible to people with access to the poll. Calendar event
          titles and raw event details are not included in the saved
          availability. You can edit or clear your availability and save again;
          closing the Calendar view does not delete previously saved
          availability.
        </p>
        <p>
          This Calendar integration does not send event details or Calendar
          access tokens to AI providers or advertisers, or use them to train AI
          models. Our separate AI feature&apos;s processing described below does
          not include this Calendar overlay.
        </p>
        <p>
          You can revoke AfterClass&apos;s Google access in your Google
          Account&apos;s{" "}
          <a
            href="https://myaccount.google.com/connections"
            className="text-primary underline-offset-4 hover:underline"
          >
            connections settings
          </a>
          . Revoking access prevents future Calendar requests but does not
          delete your AfterClass account or saved meeting availability. To
          request deletion of stored account or meeting data, contact us using
          the details below. Manual meeting availability remains available
          without Calendar access.
        </p>
      </PolicySection>

      <PolicySection title="Cookies and local storage">
        <p>
          We use cookies and browser storage for login sessions and small
          usability state — for example remembering the assistant widget&apos;s
          position, whether its welcome bubble was seen, and per-session UI
          dismissals. There is no third-party advertising or cross-site
          tracking.
        </p>
      </PolicySection>

      <PolicySection title="Who we share data with">
        <p>
          <span className="text-foreground">
            AI processors (AI turns only):
          </span>{" "}
          each chat turn is sent through third party AI providers for
          processing. These providers may train on prompts; there is no training
          opt-out, so using the AI feature consents to AI processing including
          provider training. The alternative is connecting your personal AI
          agents to the MCP, or simply not using the AI feature.
        </p>
        <p>
          <span className="text-foreground">
            Reported content (moderation only):
          </span>{" "}
          when other students report a review or a roadmap, that text alone is
          sent to a third party AI provider to check it against our{" "}
          <Link
            href="/terms#community-guidelines"
            className="text-primary underline-offset-4 hover:underline"
          >
            terms
          </Link>
          . Your name, email and account details are never sent, and neither is
          who reported it. Report counts are never shown to anyone.
        </p>
        <p>
          <span className="text-foreground">Infrastructure:</span> hosting,
          database, and error-monitoring providers that run the deployed site.
          Diagnostic logs exclude prompt contents and authentication secrets.
        </p>
        <p>
          We do not sell personal data, and we do not share it with advertisers.
        </p>
      </PolicySection>

      <PolicySection title="Retention">
        <p>
          Account and activity data is kept while you are enrolled and using the
          site. AI prompts are retained per each provider&apos;s own terms. Past
          prompts cannot be un-trained once processed.
        </p>
        <p>
          When reported content is removed for breaking the terms, a copy of the
          removed text is kept for up to 90 days so the decision can be audited,
          then deleted. The record of the decision itself is kept.
        </p>
      </PolicySection>

      <PolicySection title="Your rights">
        <p>
          You may request access to or correction of your personal data, and you
          may ask for your account to be removed. For the AI feature, choosing
          not to use it is the training opt-out: without your consent no chat
          turn is ever sent to the AI processors, and declining blocks only the
          AI feature — the rest of the site keeps working.
        </p>
        <p>
          To make a request, email{" "}
          <a
            href="mailto:helloafterclass@gmail.com"
            className="text-primary underline-offset-4 hover:underline"
          >
            helloafterclass@gmail.com
          </a>{" "}
          or reach us on Telegram at{" "}
          <span className="text-foreground">@afterclass</span> (the AfterClass
          helpdesk link on the login page).
        </p>
      </PolicySection>
    </main>
  );
}
