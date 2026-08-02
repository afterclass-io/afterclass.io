"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/common/components/button";
import { Textarea } from "@/common/components/textarea";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/common/components/tooltip";

interface InlineNotesEditorProps {
  initialNotes: string | null;
  disabled: boolean;
  onSave: (notes: string | null) => Promise<void>;
}

export function InlineNotesEditor({
  initialNotes,
  disabled,
  onSave,
}: InlineNotesEditorProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialNotes ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setValue(initialNotes ?? "");
  }, [initialNotes]);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const handleSave = useCallback(async () => {
    const trimmed = value.trim() || null;
    setEditing(false);
    await onSave(trimmed);
  }, [value, onSave]);

  const handleCancel = useCallback(() => {
    setValue(initialNotes ?? "");
    setEditing(false);
  }, [initialNotes]);

  if (!editing) {
    return (
      <div className="flex items-start gap-2">
        {initialNotes ? (
          <p className="text-sm whitespace-pre-line flex-1">{initialNotes}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">No notes</p>
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
        className="text-sm resize-none"
        placeholder="Add a note…"
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === "Escape") handleCancel();
        }}
      />
      <p className="text-xs text-muted-foreground text-right">
        {value.length}/500
      </p>
    </div>
  );
}
