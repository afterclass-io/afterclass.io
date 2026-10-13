import { describe, expect, it } from "vitest";

import { censorProfanity, censorProfanityOrNull } from "./profanity";

describe("censorProfanity", () => {
  it("masks a blocked word with same-length asterisks", () => {
    expect(censorProfanity("this is shit")).toBe("this is ****");
  });

  it("is case-insensitive", () => {
    expect(censorProfanity("FUCK off")).toBe("**** off");
  });

  it("masks multiple occurrences", () => {
    expect(censorProfanity("shit happens, shit works")).toBe(
      "**** happens, **** works",
    );
  });

  it("only masks whole words, not substrings", () => {
    expect(censorProfanity("class assignment")).toBe("class assignment");
    expect(censorProfanity("Scunthorpe problem")).toBe("Scunthorpe problem");
  });

  it("leaves clean text untouched", () => {
    expect(censorProfanity("BSc Information Systems")).toBe(
      "BSc Information Systems",
    );
  });
});

describe("censorProfanityOrNull", () => {
  it("passes null and undefined through", () => {
    expect(censorProfanityOrNull(null)).toBeNull();
    expect(censorProfanityOrNull(undefined)).toBeNull();
  });

  it("censors non-null text", () => {
    expect(censorProfanityOrNull("you bastard")).toBe("you *******");
  });
});
