import { type Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "AfterClass terms of service: who may use the site, acceptable use, accounts, AI-feature limits, and how terms change.",
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

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-prose px-4 py-10">
      <h1 className="text-2xl font-bold">Terms of Service</h1>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        AfterClass is a student-run course planning site for Singapore
        Management University students. By using the site you agree to these
        terms. See also our{" "}
        <Link
          href="/privacy"
          className="text-primary underline-offset-4 hover:underline"
        >
          privacy policy
        </Link>
        .
      </p>

      <Section title="Who may use AfterClass">
        <p>
          AfterClass is built for SMU students. You need a school email address
          to create an account, and you must keep your account credentials to
          yourself — you are responsible for anything done under your account.
        </p>
      </Section>

      <Section title="Acceptable use">
        <p>
          Use the site for lawful course planning and honest discussion. Do not
          post spam, abuse, hate, or unlawful content; do not scrape, probe, or
          attempt to disrupt the service; and do not misrepresent yourself or
          others in reviews, roadmaps, or timetables.
        </p>
        <p>
          Course reviews are other students&apos; opinions for planning
          purposes. They are not official advice and AfterClass does not verify
          every claim in them.
        </p>
      </Section>

      <Section title="Accounts and termination">
        <p>
          Your account holds your email, username, and school affiliation along
          with the timetables, bids, and roadmaps you create. We may suspend or
          remove accounts or content that break these terms or harm the service
          or its users.
        </p>
      </Section>

      <Section title="AI-feature limits">
        <p>
          The AI assistant is an opt-in feature: you must agree to the consent
          notice before chatting. Free usage is capped by a monthly message
          quota, answers are limited to supported school-planning topics, and
          bid or course estimates are informational — never guarantees of
          outcomes.
        </p>
        <p>
          Each chat turn is sent to our third party AI providers for processing,
          and providers may train on prompts — see the{" "}
          <Link
            href="/privacy"
            className="text-primary underline-offset-4 hover:underline"
          >
            privacy policy
          </Link>{" "}
          for what is sent and to whom.
        </p>
      </Section>

      <Section title="Changes to these terms">
        <p>
          We may update these terms as the site evolves. Material changes will
          be announced in-app; continued use after an update takes effect counts
          as acceptance.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about these terms? Reach us on Telegram at{" "}
          <span className="text-foreground">@afterclass</span> (the AfterClass
          helpdesk link on the login page).
        </p>
      </Section>
    </main>
  );
}
