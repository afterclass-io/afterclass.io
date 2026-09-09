import { type Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "AfterClass privacy policy: what data we collect, AI processor sharing (OpenRouter + preset pool), storage, and your rights.",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="text-muted-foreground mt-2 space-y-2 text-sm leading-relaxed">
        {children}
      </div>
    </section>
  );
}

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

      <Section title="Data we collect">
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
      </Section>

      <Section title="Cookies and local storage">
        <p>
          We use cookies and browser storage for login sessions and small
          usability state — for example remembering the assistant widget&apos;s
          position, whether its welcome bubble was seen, and per-session UI
          dismissals. There is no third-party advertising or cross-site
          tracking.
        </p>
      </Section>

      <Section title="Who we share data with">
        <p>
          <span className="text-foreground">
            AI processors (AI turns only):
          </span>{" "}
          each chat turn is sent through{" "}
          <a
            href="https://openrouter.ai/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            OpenRouter
          </a>{" "}
          and its preset model pool — DeepSeek, Google, Meta, and z.ai — for
          processing. These providers may train on prompts; there is no training
          opt-out, so using the AI feature consents to AI processing including
          provider training. The alternative is simply not using the AI feature.
          For each provider&apos;s own terms, see their published policies:{" "}
          <a
            href="https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            DeepSeek
          </a>
          {", "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            Google
          </a>
          {", "}
          <a
            href="https://www.facebook.com/privacy/policy/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            Meta
          </a>
          {", and "}
          <a
            href="https://docs.bigmodel.cn/cn/terms/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            Zhipu AI (z.ai)
          </a>
          .
        </p>
        <p>
          <span className="text-foreground">Infrastructure:</span> hosting,
          database, and error-monitoring providers that run the deployed site.
          Diagnostic logs exclude prompt contents and authentication secrets.
        </p>
        <p>
          We do not sell personal data, and we do not share it with advertisers.
        </p>
      </Section>

      <Section title="Retention">
        <p>
          Account and activity data is kept while you are enrolled and using the
          site. AI prompts are retained per each provider&apos;s own terms — see
          the provider policies linked above. Past prompts cannot be un-trained
          once processed.
        </p>
      </Section>

      <Section title="Your rights">
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
      </Section>
    </main>
  );
}
