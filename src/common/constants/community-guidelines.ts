/**
 * Community guidelines: the single source the moderation judge evaluates
 * against and the terms page renders. Change wording here only.
 */
export const POLICY_RULE_IDS = [
  "hate",
  "harassment",
  "threats",
  "personal_info",
  "sexual",
  "unjustified_rating",
] as const;

export type PolicyRuleId = (typeof POLICY_RULE_IDS)[number];

export const POLICY_RULES: Record<
  PolicyRuleId,
  { title: string; description: string }
> = {
  hate: {
    title: "Hate or slurs",
    description:
      "Slurs, or attacks on people for their race, ethnicity, religion, nationality, gender, sexual orientation, disability or similar traits, in any language.",
  },
  harassment: {
    title: "Personal attacks",
    description:
      "Insults or mockery aimed at a person rather than at their teaching, course design, workload or grading.",
  },
  threats: {
    title: "Threats",
    description: "Threats or encouragement of violence or harm against anyone.",
  },
  personal_info: {
    title: "Personal information",
    description:
      "Phone numbers, home addresses, private emails, ID numbers or other private details about anyone.",
  },
  sexual: {
    title: "Sexual content",
    description: "Sexual or sexually explicit content.",
  },
  unjustified_rating: {
    title: "Unjustified low rating",
    description:
      "A low rating (1 or 2 out of 5) whose review gives no real reason for it: empty, placeholder, gibberish or off-topic text, or text that praises the course. Positive and neutral ratings are never flagged under this rule.",
  },
};

export const POLICY_ALLOWED =
  "Negative, harsh or critical opinions about a course, a professor's teaching, workload or grading, however strongly worded, as long as they break none of the rules above. Off-topic, placeholder or low-effort text is allowed too, unless it backs a low rating (see unjustified_rating).";
