import { type Metadata } from "next";

import { PolicySection } from "@/common/components/policy-section";
import {
  POLICY_ALLOWED,
  POLICY_RULE_IDS,
  POLICY_RULES,
} from "@/common/constants/community-guidelines";

export const metadata: Metadata = {
  title: "Community Guidelines",
  description:
    "What you can and cannot post on AfterClass, and how reported reviews, roadmaps and timetables are checked.",
};

export const revalidate = 86400;

export default function GuidelinesPage() {
  return (
    <main className="mx-auto w-full max-w-prose px-4 py-10">
      <h1 className="text-2xl font-bold">Community Guidelines</h1>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        AfterClass is for honest, useful information about courses and
        professors. Criticism is welcome. These rules cover what is not.
      </p>

      <PolicySection title="Not allowed">
        <ul className="list-disc space-y-2 pl-5">
          {POLICY_RULE_IDS.map((id) => (
            <li key={id}>
              <span className="text-foreground">{POLICY_RULES[id].title}:</span>{" "}
              {POLICY_RULES[id].description}
            </li>
          ))}
        </ul>
      </PolicySection>

      <PolicySection title="Always allowed">
        <p>{POLICY_ALLOWED}</p>
      </PolicySection>

      <PolicySection title="How reporting works">
        <p>
          Signed-in students can report a review, a public or shared roadmap,
          or a shared timetable. Reports are private: nobody, including the
          author, can see who reported or how many reports there are.
        </p>
        <p>
          Reports alone never remove anything. Once several different students
          report the same content, it is checked automatically against these
          guidelines. Reviews that break them are deleted; roadmaps and
          timetables that break them are made private. Content that is only
          negative or critical stays up, however many reports it gets.
        </p>
      </PolicySection>
    </main>
  );
}
