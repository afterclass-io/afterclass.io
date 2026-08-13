import { describe, expect, it, vi } from "vitest";

import { getCurrentWindowLogic } from "./helpers";

function mockDb(windows: unknown[]) {
  return {
    bidWindow: { findMany: vi.fn().mockResolvedValue(windows) },
  } as never;
}

const base = { id: 1, acadTermId: "T1", round: "1", window: 1, acadTerm: { id: "T1" } };

describe("getCurrentWindowLogic", () => {
  it("returns null when no windows have results configured", async () => {
    await expect(getCurrentWindowLogic(mockDb([]))).resolves.toBeNull();
  });

  it("prefers the active window (opensAt <= now < resultsAt)", async () => {
    const active = { ...base, id: 2, opensAt: new Date(Date.now() - 60_000), resultsAt: new Date(Date.now() + 60_000) };
    const past = { ...base, id: 1, opensAt: new Date(Date.now() - 3_600_000), resultsAt: new Date(Date.now() - 60_000) };
    await expect(getCurrentWindowLogic(mockDb([past, active]))).resolves.toMatchObject({ id: 2 });
  });

  it("falls back to the soonest upcoming window when none is active", async () => {
    const upcoming = { ...base, opensAt: new Date(Date.now() + 60_000), resultsAt: new Date(Date.now() + 3_600_000) };
    await expect(getCurrentWindowLogic(mockDb([upcoming]))).resolves.toMatchObject({ id: 1 });
  });

  it("falls back to the most recent past window", async () => {
    const older = { ...base, id: 1, opensAt: new Date(Date.now() - 7_200_000), resultsAt: new Date(Date.now() - 3_600_000) };
    const newer = { ...base, id: 2, opensAt: new Date(Date.now() - 3_600_000), resultsAt: new Date(Date.now() - 60_000) };
    await expect(getCurrentWindowLogic(mockDb([older, newer]))).resolves.toMatchObject({ id: 2 });
  });

  it("tolerates windows with null opensAt without throwing", async () => {
    const noOpens = { ...base, opensAt: null, resultsAt: new Date(Date.now() - 60_000) };
    await expect(getCurrentWindowLogic(mockDb([noOpens]))).resolves.toMatchObject({ id: 1 });
  });
});
