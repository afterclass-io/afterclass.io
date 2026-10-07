import { type Metadata } from "next";
import Link from "next/link";

import { PolicySection } from "@/common/components/policy-section";
import {
  POLICY_ALLOWED,
  POLICY_RULE_IDS,
  POLICY_RULES,
} from "@/common/constants/community-guidelines";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "AfterClass terms of service: who may use the site, acceptable use, accounts, AI-feature limits, and how terms change.",
};

export const revalidate = 86400;

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

      <PolicySection title="Who may use AfterClass">
        <p>
          AfterClass is built for SMU students. You need a school email address
          to create an account, and you must keep your account credentials to
          yourself — you are responsible for anything done under your account.
        </p>
      </PolicySection>

      <PolicySection title="Acceptable use">
        <p>
          Use the site for lawful course planning and honest discussion. Do not
          post spam, abuse, hate, or unlawful content; do not scrape, probe, or
          attempt to disrupt the service; and do not misrepresent yourself or
          others in reviews or roadmaps.
        </p>
        <p>
          Course reviews are other students&apos; opinions for planning
          purposes. They are not official advice and AfterClass does not verify
          every claim in them.
        </p>
        <p>
          Reviews and public or shared roadmaps must follow our{" "}
          <Link
            href="#community-guidelines"
            className="text-primary underline-offset-4 hover:underline"
          >
            community guidelines
          </Link>{" "}
          below. When several students report the same content, it is checked
          automatically against those rules. Reviews that break them are
          deleted, and roadmaps that break them are made private, without notice.
        </p>
      </PolicySection>

      <PolicySection id="community-guidelines" title="Community guidelines">
        <p>
          AfterClass is for honest, useful information about courses and
          professors. Criticism is welcome. These rules cover what is not.
        </p>
        <h3 className="text-foreground font-semibold pt-2">Not allowed</h3>
        <ul className="list-disc space-y-2 pl-5">
          {POLICY_RULE_IDS.map((id) => (
            <li key={id}>
              <span className="text-foreground">{POLICY_RULES[id].title}:</span>{" "}
              {POLICY_RULES[id].description}
            </li>
          ))}
        </ul>
        <h3 className="text-foreground font-semibold pt-2">Always allowed</h3>
        <p>{POLICY_ALLOWED}</p>
        <h3 className="text-foreground font-semibold pt-2">
          How reporting works
        </h3>
        <p>
          Signed-in students can report a review or a public or shared roadmap.
          Reports are private: nobody, including the author, can see who
          reported or how many reports there are.
        </p>
        <p>
          Reports alone never remove anything. Once several different students
          report the same content, it is checked automatically against these
          guidelines. Reviews that break them are deleted; roadmaps that break
          them are made private. Content that is only negative or critical stays
          up, however many reports it gets.
        </p>
      </PolicySection>

      <PolicySection title="Accounts and termination">
        <p>
          Your account holds your email, username, and school affiliation along
          with the timetables, bids, and roadmaps you create. We may suspend or
          remove accounts or content that break these terms or harm the service
          or its users.
        </p>
      </PolicySection>

      <PolicySection title="AI-feature limits">
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
      </PolicySection>

      <PolicySection title="Changes to these terms">
        <p>
          We may update these terms as the site evolves. Material changes will
          be announced in-app; continued use after an update takes effect counts
          as acceptance.
        </p>
      </PolicySection>

      <PolicySection title="Contact">
        <p>
          Questions about these terms? Reach us on Telegram at{" "}
          <span className="text-foreground">@afterclass</span> (the AfterClass
          helpdesk link on the login page).
        </p>
      </PolicySection>
    </main>
  );
}
