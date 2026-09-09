import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

const { mockFindUnique, mockUpdate } = vi.hoisted(() => ({
  mockFindUnique: vi.fn() as Mock,
  mockUpdate: vi.fn() as Mock,
}));

vi.mock("@/server/db", () => ({
  db: { users: { findUnique: mockFindUnique, update: mockUpdate } },
}));

import { getAiConsentDate, setAiConsentNow } from "./consent";

describe("getAiConsentDate", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockUpdate.mockReset();
  });

  it("returns null when the user never consented (aiConsent NULL)", async () => {
    mockFindUnique.mockResolvedValue({ aiConsent: null });
    await expect(getAiConsentDate("u1")).resolves.toBeNull();
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: "u1" },
      select: { aiConsent: true },
    });
  });

  it("returns null for an unknown user (missing row)", async () => {
    mockFindUnique.mockResolvedValue(null);
    await expect(getAiConsentDate("ghost")).resolves.toBeNull();
  });

  it("returns the stamped date when consented", async () => {
    const stamped = new Date("2026-09-09T00:00:00.000Z");
    mockFindUnique.mockResolvedValue({ aiConsent: stamped });
    await expect(getAiConsentDate("u1")).resolves.toEqual(stamped);
  });
});

describe("setAiConsentNow", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
    mockUpdate.mockReset();
  });

  it("stamps aiConsent and returns the date", async () => {
    const stamped = new Date("2026-09-09T00:00:00.000Z");
    mockUpdate.mockResolvedValue({ aiConsent: stamped });
    await expect(setAiConsentNow("u1")).resolves.toEqual(stamped);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { aiConsent: expect.any(Date) as Date },
      select: { aiConsent: true },
    });
  });
});
