// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

type FakeRequest = {
  result: unknown;
  error: Error | null;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
};

type FakeStore = {
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  getAll: ReturnType<typeof vi.fn>;
};

type FakeTx = {
  error: Error | null;
  oncomplete: (() => void) | null;
  onerror: (() => void) | null;
  objectStore: () => FakeStore;
};

// Minimal IndexedDB stand-in. open() fires onupgradeneeded then onsuccess on
// the next microtask. Tests drive transaction and request outcomes by hand.
function installFakeIndexedDb() {
  const transactions: FakeTx[] = [];
  const requests: FakeRequest[] = [];
  const newRequest = () => {
    const req: FakeRequest = {
      result: undefined,
      error: null,
      onsuccess: null,
      onerror: null,
    };
    requests.push(req);
    return req;
  };
  const store: FakeStore = {
    put: vi.fn(newRequest),
    delete: vi.fn(newRequest),
    getAll: vi.fn(newRequest),
  };
  const transaction = vi.fn(() => {
    const tx: FakeTx = {
      error: null,
      oncomplete: null,
      onerror: null,
      objectStore: () => store,
    };
    transactions.push(tx);
    return tx;
  });
  const createObjectStore = vi.fn();
  const db = {
    objectStoreNames: { contains: () => false },
    createObjectStore,
    transaction,
  };
  const open = vi.fn(() => {
    const req = {
      result: db,
      error: null as Error | null,
      onupgradeneeded: null as (() => void) | null,
      onsuccess: null as (() => void) | null,
      onerror: null as (() => void) | null,
    };
    queueMicrotask(() => {
      req.onupgradeneeded?.();
      req.onsuccess?.();
    });
    return req;
  });
  vi.stubGlobal("indexedDB", { open });
  return { store, transaction, createObjectStore, transactions, requests };
}

function first<T>(items: T[]): T {
  const item = items[0];
  if (item === undefined) throw new Error("expected a recorded call");
  return item;
}

// idb.ts caches its open promise at module level, so each test loads a fresh copy.
async function loadIdb() {
  vi.resetModules();
  return import("./idb");
}

// Lets openDb() resolve so the module creates its transaction or request.
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("idbPut", () => {
  it("writes the value in a readwrite transaction and resolves on complete", async () => {
    const fake = installFakeIndexedDb();
    const { idbPut } = await loadIdb();
    const value = { id: "s1", title: "Hello" };

    const done = idbPut(value);
    await settle();

    expect(fake.createObjectStore).toHaveBeenCalledWith("sessions", {
      keyPath: "id",
    });
    expect(fake.transaction).toHaveBeenCalledWith("sessions", "readwrite");
    expect(fake.store.put).toHaveBeenCalledWith(value);
    first(fake.transactions).oncomplete?.();
    await expect(done).resolves.toBeUndefined();
  });

  it("rejects with the transaction error when one is set", async () => {
    const fake = installFakeIndexedDb();
    const { idbPut } = await loadIdb();

    const done = idbPut({ id: "s1" });
    const assertion = expect(done).rejects.toThrow("quota exceeded");
    await settle();
    const tx = first(fake.transactions);
    tx.error = new Error("quota exceeded");
    tx.onerror?.();

    await assertion;
  });

  it("rejects with 'Failed to write session' when the transaction error is null", async () => {
    const fake = installFakeIndexedDb();
    const { idbPut } = await loadIdb();

    const done = idbPut({ id: "s1" });
    const assertion = expect(done).rejects.toThrow("Failed to write session");
    await settle();
    first(fake.transactions).onerror?.();

    await assertion;
  });
});

describe("idbDelete", () => {
  it("deletes the id in a readwrite transaction and resolves on complete", async () => {
    const fake = installFakeIndexedDb();
    const { idbDelete } = await loadIdb();

    const done = idbDelete("s1");
    await settle();

    expect(fake.transaction).toHaveBeenCalledWith("sessions", "readwrite");
    expect(fake.store.delete).toHaveBeenCalledWith("s1");
    first(fake.transactions).oncomplete?.();
    await expect(done).resolves.toBeUndefined();
  });

  it("rejects with the transaction error when one is set", async () => {
    const fake = installFakeIndexedDb();
    const { idbDelete } = await loadIdb();

    const done = idbDelete("s1");
    const assertion = expect(done).rejects.toThrow("locked");
    await settle();
    const tx = first(fake.transactions);
    tx.error = new Error("locked");
    tx.onerror?.();

    await assertion;
  });

  it("rejects with 'Failed to delete session' when the transaction error is null", async () => {
    const fake = installFakeIndexedDb();
    const { idbDelete } = await loadIdb();

    const done = idbDelete("s1");
    const assertion = expect(done).rejects.toThrow("Failed to delete session");
    await settle();
    first(fake.transactions).onerror?.();

    await assertion;
  });
});

describe("idbGetAll", () => {
  it("resolves with the getAll request result", async () => {
    const fake = installFakeIndexedDb();
    const { idbGetAll } = await loadIdb();

    const done = idbGetAll<{ id: string }>();
    await settle();

    expect(fake.store.getAll).toHaveBeenCalledTimes(1);
    const req = first(fake.requests);
    req.result = [{ id: "a" }];
    req.onsuccess?.();
    await expect(done).resolves.toEqual([{ id: "a" }]);
  });
});
