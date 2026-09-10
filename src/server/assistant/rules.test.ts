import { describe, expect, it } from "vitest";
import { ASSISTANT_RULES } from "./rules";
describe("ASSISTANT_RULES", () => {
  it("contains the never-invent-codes rule once", () => {
    expect(ASSISTANT_RULES).toMatch(/never invent course codes/i);
    expect(ASSISTANT_RULES.match(/never invent course codes/gi)).toHaveLength(
      1,
    );
  });
  it("stays in sync with the canned capabilities text it documents", async () => {
    // Drift guard: rules.ts is documentation-only (no runtime importer — the
    // route.ts import would trip `server-only` and change cached prompt bytes),
    // so pin the shared lines against the canned site, which is import-safe.
    // Prompt-template parity is pinned by src/mcp/prompts.test.ts ("Do not
    // invent course codes" asserts) and route.ts parity by the
    // "keeps the SYSTEM_PROMPT head byte-identical" test — this suite only
    // asserts rules.ts carries the same invariants.
    const { findCannedAnswer } = await import("./canned");
    expect(ASSISTANT_RULES).toContain(
      "You are the afterclass.io assistant, helping SMU students plan their studies.",
    );
    expect(ASSISTANT_RULES).toContain(
      "Scope: you help with SMU courses, bids, timetables, roadmaps, and reviews only.",
    );
    expect(
      findCannedAnswer([
        {
          id: "u1",
          role: "user",
          parts: [{ type: "text", text: "What are your capabilities?" }],
        },
      ]),
    ).toContain("afterclass.io assistant for SMU students");
  });
});
