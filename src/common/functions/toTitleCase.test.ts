import { describe, expect, it } from "vitest";
import { toTitleCase } from "./toTitleCase";

describe("toTitleCase", () => {
  it("title-cases each whitespace-delimited word", () => {
    expect(toTitleCase("THE QUICK BROWN FOX")).toBe("The Quick Brown Fox");
    expect(toTitleCase("hello world")).toBe("Hello World");
  });

  it("upper-cases only the first letter and lower-cases the rest of a word", () => {
    expect(toTitleCase("McDONALD ExAmPlE")).toBe("Mcdonald Example");
  });

  it("treats a hyphenated word as one word (only its first letter is capitalised)", () => {
    expect(toTitleCase("well-known")).toBe("Well-known");
  });

  it("passes through empty and whitespace-only strings", () => {
    expect(toTitleCase("")).toBe("");
    expect(toTitleCase("   ")).toBe("   ");
  });
});
