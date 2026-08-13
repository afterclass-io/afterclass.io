import { describe, expect, it, vi } from "vitest";
import {
  isConflictError,
  saveEntriesWithConflictRetry,
} from "./save-with-retry";

function trpcError(code: string) {
  return { message: "error", data: { code } };
}

const input = {
  roadmapId: "r1",
  updatedAt: "2026-08-01T00:00:00.000Z",
  entries: [
    { courseId: "c1", yearNumber: 1, term: "T1" as const, sortOrder: 0 },
  ],
};

describe("isConflictError", () => {
  it("detects tRPC CONFLICT errors via error.data.code", () => {
    expect(isConflictError(trpcError("CONFLICT"))).toBe(true);
  });

  it("returns false for other codes and plain errors", () => {
    expect(isConflictError(trpcError("BAD_REQUEST"))).toBe(false);
    expect(isConflictError(new Error("boom"))).toBe(false);
    expect(isConflictError(null)).toBe(false);
    expect(isConflictError(undefined)).toBe(false);
  });
});

describe("saveEntriesWithConflictRetry", () => {
  it("saves once when the first attempt succeeds", async () => {
    const save = vi.fn().mockResolvedValue({ count: 1 });
    const getFreshUpdatedAt = vi.fn();
    await saveEntriesWithConflictRetry(input, save, getFreshUpdatedAt);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(input);
    expect(getFreshUpdatedAt).not.toHaveBeenCalled();
  });

  it("retries once with the fresh updatedAt on CONFLICT", async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(trpcError("CONFLICT"))
      .mockResolvedValueOnce({ count: 1 });
    const getFreshUpdatedAt = vi
      .fn()
      .mockResolvedValue("2026-08-02T00:00:00.000Z");
    await saveEntriesWithConflictRetry(input, save, getFreshUpdatedAt);
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith({
      ...input,
      updatedAt: "2026-08-02T00:00:00.000Z",
    });
  });

  it("rethrows a non-CONFLICT error without retrying", async () => {
    const save = vi.fn().mockRejectedValue(trpcError("BAD_REQUEST"));
    const getFreshUpdatedAt = vi.fn();
    await expect(
      saveEntriesWithConflictRetry(input, save, getFreshUpdatedAt),
    ).rejects.toMatchObject({ data: { code: "BAD_REQUEST" } });
    expect(save).toHaveBeenCalledTimes(1);
    expect(getFreshUpdatedAt).not.toHaveBeenCalled();
  });

  it("rethrows when the retry also conflicts (genuine cross-device edit)", async () => {
    const save = vi.fn().mockRejectedValue(trpcError("CONFLICT"));
    const getFreshUpdatedAt = vi
      .fn()
      .mockResolvedValue("2026-08-02T00:00:00.000Z");
    await expect(
      saveEntriesWithConflictRetry(input, save, getFreshUpdatedAt),
    ).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    expect(save).toHaveBeenCalledTimes(2);
    expect(getFreshUpdatedAt).toHaveBeenCalledTimes(1);
  });

  it("does not retry a CONFLICT when no version token was sent (duplicate-course backstop)", async () => {
    const save = vi.fn().mockRejectedValue(trpcError("CONFLICT"));
    const getFreshUpdatedAt = vi.fn();
    await expect(
      saveEntriesWithConflictRetry(
        { roadmapId: "r1", entries: input.entries },
        save,
        getFreshUpdatedAt,
      ),
    ).rejects.toMatchObject({ data: { code: "CONFLICT" } });
    expect(save).toHaveBeenCalledTimes(1);
    expect(getFreshUpdatedAt).not.toHaveBeenCalled();
  });
});
