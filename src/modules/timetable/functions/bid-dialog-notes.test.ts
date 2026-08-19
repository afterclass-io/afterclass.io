import { describe, expect, it } from "vitest";
import { resolveBidDialogNotes } from "./bid-dialog-notes";

// An edit-mode bid with saved notes, as passed by the BidsTable row.
const bid = { classId: "c1", bidWindowId: 7, notes: "saved notes" };

describe("resolveBidDialogNotes", () => {
  it("does nothing before the getByClassIds query has settled", () => {
    expect(
      resolveBidDialogNotes({
        mode: "edit",
        bid,
        selectedClassId: "c1",
        selectedBidWindowId: "7",
        classBids: [],
        loadedNotesKey: null,
        classBidsSettled: false,
      }),
    ).toEqual({});
  });

  it("edit mode: never wipes pre-filled bid notes on settle (regression: silent data loss)", () => {
    // The still-empty cache / errored fetch must not overwrite `bid.notes`.
    const result = resolveBidDialogNotes({
      mode: "edit",
      bid,
      selectedClassId: "c1",
      selectedBidWindowId: "7",
      classBids: [],
      loadedNotesKey: null,
      classBidsSettled: true,
    });
    expect(result.notes).toBeUndefined();
    expect(result.loadedNotesKey).toBe("c1:7");
  });

  it("edit mode: keeps pre-filled notes even when the cache settles with other bids", () => {
    const result = resolveBidDialogNotes({
      mode: "edit",
      bid,
      selectedClassId: "c1",
      selectedBidWindowId: "7",
      classBids: [{ bidWindowId: 7, notes: "saved notes" }],
      loadedNotesKey: null,
      classBidsSettled: true,
    });
    expect(result.notes).toBeUndefined();
    expect(result.loadedNotesKey).toBe("c1:7");
  });

  it("edit mode: loads another window's notes once the user switches window", () => {
    expect(
      resolveBidDialogNotes({
        mode: "edit",
        bid,
        selectedClassId: "c1",
        selectedBidWindowId: "8",
        classBids: [
          { bidWindowId: 7, notes: "saved notes" },
          { bidWindowId: 8, notes: "window 8 notes" },
        ],
        loadedNotesKey: "c1:7",
        classBidsSettled: true,
      }),
    ).toEqual({ notes: "window 8 notes", loadedNotesKey: "c1:8" });
  });

  it("add/class mode: applies the window's existing notes only once the query settles", () => {
    // Not settled yet — must not latch an empty value (the brief's (e) race).
    expect(
      resolveBidDialogNotes({
        mode: "add",
        selectedClassId: "c1",
        selectedBidWindowId: "7",
        classBids: [{ bidWindowId: 7, notes: "existing notes" }],
        loadedNotesKey: null,
        classBidsSettled: false,
      }),
    ).toEqual({});

    // Settled — loads the window's notes.
    expect(
      resolveBidDialogNotes({
        mode: "add",
        selectedClassId: "c1",
        selectedBidWindowId: "7",
        classBids: [{ bidWindowId: 7, notes: "existing notes" }],
        loadedNotesKey: null,
        classBidsSettled: true,
      }),
    ).toEqual({ notes: "existing notes", loadedNotesKey: "c1:7" });
  });

  it("class mode: clears notes when no bid exists for the selected window", () => {
    expect(
      resolveBidDialogNotes({
        mode: "class",
        selectedClassId: "c1",
        selectedBidWindowId: "9",
        classBids: [{ bidWindowId: 7, notes: "other window" }],
        loadedNotesKey: "c1:7",
        classBidsSettled: true,
      }),
    ).toEqual({ notes: "", loadedNotesKey: "c1:9" });
  });

  it("does not re-apply notes for an already-loaded window (no typing clobber)", () => {
    expect(
      resolveBidDialogNotes({
        mode: "add",
        selectedClassId: "c1",
        selectedBidWindowId: "7",
        classBids: [{ bidWindowId: 7, notes: "existing notes" }],
        loadedNotesKey: "c1:7",
        classBidsSettled: true,
      }),
    ).toEqual({});
  });

  it("edit mode: restores the bid's own notes after switching away and back (regression: round-trip silent loss)", () => {
    // Window 8 was loaded (latched "c1:8", textarea now empty), then the user
    // switches back to the bid's own window 7 — the bid's notes must come
    // back, otherwise the save would send `notes: null` and delete them.
    const result = resolveBidDialogNotes({
      mode: "edit",
      bid,
      selectedClassId: "c1",
      selectedBidWindowId: "7",
      classBids: [
        { bidWindowId: 7, notes: "saved notes" },
        { bidWindowId: 8, notes: "" },
      ],
      loadedNotesKey: "c1:8",
      classBidsSettled: true,
    });
    expect(result).toEqual({ notes: "saved notes", loadedNotesKey: "c1:7" });
  });

  it("edit mode: restoring the own window clears notes when the bid has none", () => {
    // Same round-trip, but the bid has no saved notes — restoring means
    // emitting an empty string (the own window legitimately has no notes).
    expect(
      resolveBidDialogNotes({
        mode: "edit",
        bid: { classId: "c1", bidWindowId: 7, notes: null },
        selectedClassId: "c1",
        selectedBidWindowId: "7",
        classBids: [{ bidWindowId: 8, notes: "" }],
        loadedNotesKey: "c1:8",
        classBidsSettled: true,
      }),
    ).toEqual({ notes: "", loadedNotesKey: "c1:7" });
  });

  it("edit mode: cold mount settle never emits notes (no wipe, no clobber of early typing)", () => {
    // Round-1 contract: with nothing latched yet the settle must not touch the
    // textarea — the pre-filled `bid.notes` (or whatever the user typed before
    // the query resolved) stays put; the key is only latched.
    expect(
      resolveBidDialogNotes({
        mode: "edit",
        bid,
        selectedClassId: "c1",
        selectedBidWindowId: "7",
        classBids: [],
        loadedNotesKey: null,
        classBidsSettled: true,
      }),
    ).toEqual({ loadedNotesKey: "c1:7" });
  });
});
