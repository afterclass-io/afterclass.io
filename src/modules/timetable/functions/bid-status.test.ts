import { describe, expect, it } from "vitest";
import {
  BID_STATUS_LABELS,
  BID_STATUS_OPTIONS,
  bidChipVariant,
  slotCardVariant,
} from "./bid-status";
import type { UserBidStatus } from "./bid-status";

const ALL: UserBidStatus[] = [
  "PLANNED",
  "SECURED",
  "DROPPED",
  "CANCELLED",
  "PARTICIPATED",
];

describe("bidChipVariant", () => {
  it("returns the muted variant when status is undefined", () => {
    expect(bidChipVariant(undefined)).toBe("bg-muted/15 text-muted-foreground");
  });

  it("maps each known status to its chip classes", () => {
    expect(bidChipVariant("SECURED")).toBe("bg-success/15 text-success");
    expect(bidChipVariant("PLANNED")).toBe("bg-info/15 text-info");
    expect(bidChipVariant("DROPPED")).toBe("bg-error/15 text-error");
    expect(bidChipVariant("CANCELLED")).toBe("bg-error/15 text-error");
    expect(bidChipVariant("PARTICIPATED")).toBe(
      "bg-muted text-muted-foreground",
    );
  });

  it("falls back to the muted variant for an unknown status (impossible state)", () => {
    expect(bidChipVariant("FOO" as UserBidStatus)).toBe(
      "bg-muted/15 text-muted-foreground",
    );
  });
});

describe("slotCardVariant", () => {
  it("returns null when status is undefined", () => {
    expect(slotCardVariant(undefined)).toBeNull();
  });

  it("returns a non-null card variant for every known status", () => {
    for (const s of ALL) expect(slotCardVariant(s)).not.toBeNull();
    expect(slotCardVariant("DROPPED")).toBe(
      "bg-error/15 border-error/30 text-foreground",
    );
  });

  it("returns null for an unknown status (impossible state)", () => {
    expect(slotCardVariant("FOO" as UserBidStatus)).toBeNull();
  });
});

describe("status tables", () => {
  it("labels every status", () => {
    for (const s of ALL) expect(BID_STATUS_LABELS[s]).toBeTruthy();
  });

  it("exposes the five statuses as select options with matching labels", () => {
    expect(BID_STATUS_OPTIONS).toHaveLength(5);
    for (const opt of BID_STATUS_OPTIONS) {
      expect(opt.label).toBe(BID_STATUS_LABELS[opt.value]);
    }
  });
});
