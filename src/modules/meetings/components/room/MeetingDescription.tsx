"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/common/components/button";
import { Textarea } from "@/common/components/textarea";

const MAX_DESCRIPTION_LENGTH = 500;

export type MeetingDescriptionProps = {
  description: string | null;
  canEdit: boolean;
  isSaving: boolean;
  onSave: (description: string | null) => void;
};

/** One-line summary under the title. Only the creator can change it. */
export function MeetingDescription({
  description,
  canEdit,
  isSaving,
  onSave,
}: MeetingDescriptionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(description ?? "");

  if (isEditing) {
    return (
      <form
        className="max-w-xl space-y-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draft.trim() || null);
          setIsEditing(false);
        }}
      >
        <Textarea
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="What is this meeting about?"
          aria-label="Description"
          maxLength={MAX_DESCRIPTION_LENGTH}
          rows={2}
          className="min-h-0 resize-none text-sm"
        />
        <div className="flex gap-1.5">
          <Button type="submit" size="sm" disabled={isSaving}>
            Save
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(false)}
          >
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  if (!description && !canEdit) return null;

  const startEditing = () => {
    setDraft(description ?? "");
    setIsEditing(true);
  };

  return (
    <div className="flex min-w-0 items-start gap-1.5">
      {description ? (
        <p
          className="text-muted-foreground max-w-xl text-sm break-words"
          data-test="meeting-description"
        >
          {description}
        </p>
      ) : (
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={startEditing}
          className="h-auto p-0 text-muted-foreground hover:text-foreground text-sm"
          data-test="meeting-description-add"
        >
          Add a description
        </Button>
      )}
      {canEdit && description && (
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground size-6 shrink-0"
          aria-label="Edit description"
          onClick={startEditing}
          data-test="meeting-description-edit"
        >
          <Pencil className="size-3" />
        </Button>
      )}
    </div>
  );
}
