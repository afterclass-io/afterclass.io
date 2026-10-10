"use client";

import { atom } from "jotai";
import { nanoid } from "nanoid";
import type { UIMessage } from "ai";
import {
  capMessages,
  pruneSessions,
  titleFromMessages,
} from "./chat-store-logic";
import { idbDelete, idbGetAll, idbPut } from "./idb";

export type StoredSession = {
  id: string;
  title: string;
  updatedAt: string;
  messages: UIMessage[];
};

export const sessionsAtom = atom<StoredSession[]>([]);
export const hydratedAtom = atom(false);
export const activeSessionIdAtom = atom<string | null>(null);

// In-flight hydrate guard: concurrent hydrate calls share one promise
// instead of racing two idbGetAll reads.
const hydratingAtom = atom<Promise<void> | null>(null);

export const hydrateAtom = atom(null, async (get, set) => {
  if (get(hydratedAtom)) return;
  let pending = get(hydratingAtom);
  if (!pending) {
    pending = (async () => {
      const sessions = await idbGetAll<StoredSession>();
      sessions.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
      set(sessionsAtom, sessions);
      set(hydratedAtom, true);
    })().finally(() => {
      set(hydratingAtom, null);
    });
    set(hydratingAtom, pending);
  }
  await pending;
});

export const createSessionAtom = atom(null, async (_get, set) => {
  const id = nanoid();
  const session: StoredSession = {
    id,
    title: "New chat",
    updatedAt: new Date().toISOString(),
    messages: [],
  };
  await idbPut(session);
  set(sessionsAtom, (sessions) => pruneSessions([...sessions, session]));
  set(activeSessionIdAtom, id);
  return id;
});

export const saveSessionAtom = atom(
  null,
  async (get, set, id: string, messages: UIMessage[]) => {
    const capped = capMessages(messages);
    const existing = get(sessionsAtom).find((x) => x.id === id);
    const title =
      existing && existing.title !== "New chat"
        ? existing.title
        : (titleFromMessages(capped) ?? existing?.title ?? "New chat");
    const session: StoredSession = {
      id,
      title,
      updatedAt: new Date().toISOString(),
      messages: capped,
    };
    await idbPut(session);
    set(sessionsAtom, (sessions) =>
      pruneSessions(sessions.map((x) => (x.id === id ? session : x))),
    );
  },
);

export const renameSessionAtom = atom(
  null,
  async (get, set, id: string, title: string) => {
    const clean = title.trim().slice(0, 100);
    if (!clean) return;
    const existing = get(sessionsAtom).find((x) => x.id === id);
    if (!existing) return;
    const session: StoredSession = {
      ...existing,
      title: clean,
      updatedAt: new Date().toISOString(),
    };
    await idbPut(session);
    set(sessionsAtom, (sessions) =>
      sessions.map((x) => (x.id === id ? session : x)),
    );
  },
);

export const deleteSessionAtom = atom(null, async (_get, set, id: string) => {
  await idbDelete(id);
  set(sessionsAtom, (sessions) => sessions.filter((x) => x.id !== id));
  set(activeSessionIdAtom, (active) => (active === id ? null : active));
});
