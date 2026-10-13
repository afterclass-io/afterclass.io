import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore } from "jotai";

const { idbGetAll } = vi.hoisted(() => ({
  idbGetAll: vi.fn(),
}));

vi.mock("./idb", () => ({
  idbGetAll,
  idbPut: vi.fn(async () => undefined),
  idbDelete: vi.fn(async () => undefined),
}));

import {
  deleteSessionAtom,
  activeSessionIdAtom,
  createSessionAtom,
  hydrateAtom,
  hydratedAtom,
  sessionsAtom,
  type StoredSession,
} from "./chat-store";

const session = (id: string, updatedAt: string): StoredSession => ({
  id,
  title: id,
  updatedAt,
  messages: [],
});

beforeEach(() => {
  idbGetAll.mockReset();
});

describe("chat store atoms", () => {
  it("shares one read between concurrent hydrate calls and sorts newest first", async () => {
    idbGetAll.mockResolvedValue([
      session("old", "2026-01-01T00:00:00.000Z"),
      session("new", "2026-02-01T00:00:00.000Z"),
    ]);
    const store = createStore();

    await Promise.all([store.set(hydrateAtom), store.set(hydrateAtom)]);

    expect(idbGetAll).toHaveBeenCalledTimes(1);
    expect(store.get(hydratedAtom)).toBe(true);
    expect(store.get(sessionsAtom).map((s) => s.id)).toEqual(["new", "old"]);
  });

  it("retries hydrate after a failed read", async () => {
    idbGetAll.mockRejectedValueOnce(new Error("idb unavailable"));
    idbGetAll.mockResolvedValueOnce([session("a", "2026-01-01T00:00:00.000Z")]);
    const store = createStore();

    await expect(store.set(hydrateAtom)).rejects.toThrow("idb unavailable");
    expect(store.get(hydratedAtom)).toBe(false);

    await store.set(hydrateAtom);

    expect(idbGetAll).toHaveBeenCalledTimes(2);
    expect(store.get(hydratedAtom)).toBe(true);
    expect(store.get(sessionsAtom).map((s) => s.id)).toEqual(["a"]);
  });

  it("returns early once hydrated", async () => {
    idbGetAll.mockResolvedValue([]);
    const store = createStore();

    await store.set(hydrateAtom);
    await store.set(hydrateAtom);

    expect(idbGetAll).toHaveBeenCalledTimes(1);
  });

  it("creates an active session and clears the active id on delete", async () => {
    const store = createStore();

    const id = await store.set(createSessionAtom);
    expect(store.get(activeSessionIdAtom)).toBe(id);
    expect(store.get(sessionsAtom)[0]).toMatchObject({ id, title: "New chat" });

    await store.set(deleteSessionAtom, id);
    expect(store.get(activeSessionIdAtom)).toBeNull();
    expect(store.get(sessionsAtom)).toEqual([]);
  });
});
