import { describe, expect, it } from "vitest";

import {
  addLinksFromText,
  getLinkLabel,
  meetingLinksSchema,
  parseLinkLines,
} from "./meeting-links";

describe("meeting links", () => {
  it("parses one link per line and upgrades bare domains", () => {
    expect(parseLinkLines("zoom.us/j/1\n\n  http://a.dev/x  ")).toEqual([
      "https://zoom.us/j/1",
      "http://a.dev/x",
    ]);
  });

  it("rejects non-http links and too many links", () => {
    expect(meetingLinksSchema.safeParse(["javascript:alert(1)"]).success).toBe(
      false,
    );
    expect(
      meetingLinksSchema.safeParse(Array(6).fill("https://a.dev")).success,
    ).toBe(false);
    expect(meetingLinksSchema.safeParse(["https://a.dev"]).success).toBe(true);
  });

  it("adds pasted links, splitting on whitespace and commas", () => {
    const result = addLinksFromText(
      ["https://a.dev"],
      "zoom.us/j/1, https://a.dev\nhttps://docs.example.com/x",
    );

    expect(result.links).toEqual([
      "https://a.dev",
      "https://zoom.us/j/1",
      "https://docs.example.com/x",
    ]);
    expect(result.rejected).toEqual([]);
    expect(result.overflow).toBe(false);
  });

  it("reports invalid entries and a full list", () => {
    expect(addLinksFromText([], "hello javascript:alert(1)").rejected).toEqual([
      "hello",
      "javascript:alert(1)",
    ]);

    const full = Array.from({ length: 5 }, (_, i) => `https://a${i}.dev`);
    const result = addLinksFromText(full, "https://extra.dev");
    expect(result.links).toEqual(full);
    expect(result.overflow).toBe(true);
  });

  it("labels a link by host", () => {
    expect(getLinkLabel("https://www.notion.so/page")).toBe("notion.so");
    expect(getLinkLabel("not a url")).toBe("not a url");
  });
});
