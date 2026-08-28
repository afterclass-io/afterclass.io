"use client";

import { useRef, useState } from "react";
import { MessageSquareIcon, PencilIcon, PlusIcon, TrashIcon } from "lucide-react";

import { useChatStore } from "./chat-store";
import { cn } from "@/common/functions/index";
import { Button } from "@/common/components/button";

export function SessionList({
  activeSessionId,
  onSelect,
  onNew,
}: {
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const sessions = useChatStore((s) => s.sessions);
  const hydrated = useChatStore((s) => s.hydrated);
  const rename = useChatStore((s) => s.renameSession);
  const remove = useChatStore((s) => s.deleteSession);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  // True when the current edit was cancelled with Escape. The input's onBlur
  // still fires when the editor unmounts, so without this guard "cancel"
  // would silently commit the draft and overwrite the original title.
  const escapedRef = useRef(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const commitRename = async (id: string) => {
    setEditingId(null);
    if (escapedRef.current) {
      escapedRef.current = false;
      return;
    }
    const title = draft.trim();
    if (!title || title === sessions?.find((s) => s.id === id)?.title) return;
    await rename(id, title);
  };

  const requestDelete = (id: string) => setConfirmingId(id);
  const cancelDelete = () => setConfirmingId(null);
  const confirmDelete = async (id: string) => {
    await remove(id);
    setConfirmingId(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2" data-test="session-list">
      <Button
        type="button"
        variant="default"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={onNew}
        data-umami-event="assistant-new-session-click"
      >
        <PlusIcon className="size-4" />
        New chat
      </Button>
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {!hydrated && <p className="text-muted-foreground px-2 py-1 text-xs">Loading...</p>}
        {hydrated && sessions.length === 0 && (
          <p className="text-muted-foreground px-2 py-1 text-xs">No sessions yet - start a new chat.</p>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            className={cn(
              "group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm",
              s.id === activeSessionId
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {editingId === s.id ? (
              // While editing, render the editor OUTSIDE any button: a plain
              // non-interactive span keeps the layout but drops the select
              // button, so the input is never nested inside interactive content
              // (a11y: no interactive-in-interactive, single tab stop for editor).
              <span className="flex min-w-0 flex-1 items-center gap-1 rounded text-left">
                <MessageSquareIcon className="size-3.5 shrink-0" />
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => commitRename(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void commitRename(s.id);
                    if (e.key === "Escape") {
                      escapedRef.current = true;
                      setEditingId(null);
                    }
                  }}
                  aria-label="Session title"
                  className="min-w-0 flex-1 rounded border bg-background px-1.5 py-0.5 text-sm outline-none"
                />
              </span>
            ) : confirmingId === s.id ? (
              <div
                role="alertdialog"
                aria-label={`Delete ${s.title}?`}
                onKeyDown={(e) => {
                  if (e.key === "Escape") cancelDelete();
                }}
                className="flex min-w-0 flex-1 items-center gap-1.5 rounded bg-destructive/10 px-2 py-1 text-left"
              >
                <span className="min-w-0 flex-1 truncate text-xs">Delete {s.title}?</span>
                <button
                  type="button"
                  autoFocus
                  onClick={() => void confirmDelete(s.id)}
                  className="shrink-0 rounded bg-destructive px-2 py-0.5 text-xs font-semibold text-white hover:opacity-90"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={cancelDelete}
                  className="shrink-0 rounded px-2 py-0.5 text-xs hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                aria-current={s.id === activeSessionId ? "true" : undefined}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-1 rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <MessageSquareIcon className="size-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{s.title}</span>
              </button>
            )}
            {editingId === s.id || confirmingId === s.id ? null : (
              <>
                <button
                  type="button"
                  aria-label={`Rename ${s.title}`}
                  className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                  onClick={() => {
                    escapedRef.current = false;
                    setEditingId(s.id);
                    setDraft(s.title);
                  }}
                >
                  <PencilIcon className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${s.title}`}
                  className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                  onClick={() => requestDelete(s.id)}
                >
                  <TrashIcon className="size-3.5" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
      <p className="text-muted-foreground border-t pt-2 text-[11px]">
        Chat history is saved on this device only.
      </p>
    </div>
  );
}
