import { describe, expect, it } from "vitest";

import { emailMatchesDomain } from "./email-domain";
import fixtures from "./email-domain.fixtures.json";

describe("emailMatchesDomain", () => {
  it.each(fixtures)(
    "evaluates email '$email' against domain '$domain' as $expected",
    ({ email, domain, expected }) => {
      expect(emailMatchesDomain(email, domain)).toBe(expected);
    },
  );
});
