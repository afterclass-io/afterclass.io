"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import type { UIMessage } from "ai";
import { capMessages, pruneSessions, titleFromMessages } from "./chat-store-logic";
import { idbDelete, idbGetAll, idbPut } from "./idb";

export type StoredSession = {
  id: string;
  title: string;
  updatedAt: string;
  messages: UIMessage[];
};

type ChatStore = {
  hydrated: boolean;
  sessions: StoredSession[];
  activeSessionId: string | null;
  hydrate: () => Promise<void>;
  createSession: () => Promise<string>;
  saveSession: (id: string, messages: UIMessage[]) => Promise<void>;
  renameSession: (id: string, title: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  setActive: (id: string | null) => void;
};

export const useChatStore = create<ChatStore>((set, get) => ({
  hydrated: false,
  sessions: [],
  activeSessionId: null,

  hydrate: async () => {
    if (get().hydrated) return;
    const sessions = await idbGetAll<StoredSession>();
    sessions.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    set({ sessions, hydrated: true });
  },

  createSession: async () => {
    const id = nanoid();
    const session: StoredSession = { id, title: "New chat", updatedAt: new Date().toISOString(), messages: [] };
    await idbPut(session);
    set((s) => ({ sessions: pruneSessions([...s.sessions, session]), activeSessionId: id }));
    return id;
  },

  saveSession: async (id, messages) => {
    const capped = capMessages(messages);
    const existing = get().sessions.find((x) => x.id === id);
    const title =
      existing && existing.title !== "New chat"
        ? existing.title
        : (titleFromMessages(capped) ?? existing?.title ?? "New chat");
    const session: StoredSession = { id, title, updatedAt: new Date().toISOString(), messages: capped };
    await idbPut(session);
    set((s) => ({ sessions: pruneSessions(s.sessions.map((x) => (x.id === id ? session : x))) }));
  },

  renameSession: async (id, title) => {
    const clean = title.trim().slice(0, 100);
    if (!clean) return;
    const existing = get().sessions.find((x) => x.id === id);
    if (!existing) return;
    const session: StoredSession = { ...existing, title: clean, updatedAt: new Date().toISOString() };
    await idbPut(session);
    set((s) => ({ sessions: s.sessions.map((x) => (x.id === id ? session : x)) }));
  },

  deleteSession: async (id) => {
    await idbDelete(id);
    set((s) => ({
      sessions: s.sessions.filter((x) => x.id !== id),
      activeSessionId: s.activeSessionId === id ? null : s.activeSessionId,
    }));
  },

  setActive: (id) => set({ activeSessionId: id }),
}));
