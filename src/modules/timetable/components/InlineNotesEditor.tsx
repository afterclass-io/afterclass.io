"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useSetAtom } from "jotai";
import { Pencil } from "lucide-react";
import { pushHistoryAtom } from "@/modules/timetable/atoms/history";
import { Button } from "@/common/components/button";
import { Textarea } from "@/common/components/textarea";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/common/components/tooltip";

interface InlineNotesEditorProps {
  initialNotes: string | null;
  disabled: boolean;
  onSave: (notes: string | null) => Promise<void>;
  /** Bid id — when provided, a successful save is recorded for undo/redo. */
  bidId?: string;
}

export function InlineNotesEditor({
  initialNotes,
  disabled,
  onSave,
  bidId,
}: InlineNotesEditorProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialNotes ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pushHistory = useSetAtom(pushHistoryAtom);

  // Adopt incoming notes when the prop changes (e.g. undo) — render
  // adjustment, not an effect; converges immediately.
  const [prevInitialNotes, setPrevInitialNotes] = useState(initialNotes);
  if (initialNotes !== prevInitialNotes) {
    setPrevInitialNotes(initialNotes);
    setValue(initialNotes ?? "");
  }

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const handleSave = useCallback(async () => {
    const trimmed = value.trim() || null;
    setEditing(false);
    await onSave(trimmed);
    // Record for undo/redo (skip no-op saves); the inverse edit is issued
    // by the history hook via `userBids.update`.
    if (bidId && trimmed !== initialNotes) {
      pushHistory({
        type: "editNotes",
        bidId,
        fromNotes: initialNotes,
        toNotes: trimmed,
      });
    }
  }, [value, onSave, bidId, initialNotes, pushHistory]);

  const handleCancel = useCallback(() => {
    setValue(initialNotes ?? "");
    setEditing(false);
  }, [initialNotes]);

  if (!editing) {
    return (
      <div className="flex items-start gap-2">
        {initialNotes ? (
          <p className="flex-1 text-sm whitespace-pre-line">{initialNotes}</p>
        ) : (
          <p className="text-muted-foreground flex-1 text-sm italic">
            No notes
          </p>
        )}
        {!disabled && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                aria-label="Edit notes"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit notes</TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={500}
        rows={3}
        className="resize-none text-sm"
        placeholder="Add a note…"
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Escape") handleCancel();
        }}
      />
      <p className="text-muted-foreground text-right text-xs">
        {value.length}/500
      </p>
    </div>
  );
}
