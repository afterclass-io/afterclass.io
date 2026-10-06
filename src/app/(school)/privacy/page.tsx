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
        .
      </p>

      <PolicySection title="Data we collect">
        <p>
          <span className="text-foreground">Account data:</span> your name,
          email, username, faculty, and university, which you provide when you
          sign up with your school email.
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
          when other students report a review, a roadmap, or a shared timetable
          name, that text alone is sent to a third party AI provider to check it
          against our Community Guidelines. Your name, email and account details
          are never sent, and neither is who reported it. Report counts are
          never shown to anyone.
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
          When reported content is removed for breaking the Community
          Guidelines, a copy of the removed text is kept for up to 90 days so
          the decision can be audited, then deleted. The record of the decision
          itself is kept.
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
          To make a request, reach us on Telegram at{" "}
          <span className="text-foreground">@afterclass</span> (the AfterClass
          helpdesk link on the login page).
        </p>
      </PolicySection>
    </main>
  );
}
