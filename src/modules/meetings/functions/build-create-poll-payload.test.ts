import { describe, expect, it } from "vitest";

import { buildCreatePollPayload } from "./build-create-poll-payload";

const base = {
  title: "  Sprint Sync  ",
  startDate: "2026-10-12",
  endDate: "2026-10-16",
  startHour: 8,
  endHour: 22,
};

describe("buildCreatePollPayload", () => {
  it("never sends an empty-string courseId or section (UUID regression)", () => {
    const payload = buildCreatePollPayload({
      ...base,
      courseId: "",
      section: "",
      agenda: "",
      teamIdentifier: "",
    });

    expect(payload.courseId).toBeNull();
    expect(payload.section).toBeNull();
    expect(payload.agenda).toBeNull();
    expect(payload.links).toEqual([]);
    expect(payload.teamIdentifier).toBeNull();
  });

  it("treats omitted and whitespace-only optionals as null", () => {
    const payload = buildCreatePollPayload({
      ...base,
      courseId: "   ",
      teamIdentifier: "  ",
    });

    expect(payload.courseId).toBeNull();
    expect(payload.section).toBeNull();
    expect(payload.teamIdentifier).toBeNull();
  });

  it("passes a selected class through and trims text fields", () => {
    const payload = buildCreatePollPayload({
      ...base,
      agenda: " Agenda ",
      links: ["https://meet.google.com/abc", "https://docs.example.com/x"],
      courseId: "2a45bab1-5ec4-4d2e-b245-27a142a78890",
      section: "G1",
      teamIdentifier: " Team 3 ",
    });

    expect(payload).toEqual({
      title: "Sprint Sync",
      agenda: "Agenda",
      links: ["https://meet.google.com/abc", "https://docs.example.com/x"],
      startDate: "2026-10-12",
      endDate: "2026-10-16",
      startHour: 8,
      endHour: 22,
      courseId: "2a45bab1-5ec4-4d2e-b245-27a142a78890",
      section: "G1",
      teamIdentifier: "Team 3",
    });
  });
});
