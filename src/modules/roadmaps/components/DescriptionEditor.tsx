"use client";

import { useState } from "react";
import { Textarea } from "@/common/components/textarea";

const DESCRIPTION_MAX_LENGTH = 500;

/**
 * Roadmap description editor — multiline, capped at DESCRIPTION_MAX_LENGTH
 * characters with a live counter. Newlines are preserved on save.
 */
export function DescriptionEditor({
  initialValue,
  onSave,
}: {
  initialValue: string;
  onSave: (description: string) => void;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="relative min-w-56 flex-1">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a description (shown when you publish)…"
        maxLength={DESCRIPTION_MAX_LENGTH}
        rows={3}
        className="min-h-16 resize-y pb-5 text-sm"
        onBlur={() => onSave(value)}
        aria-label="Roadmap description"
        data-test="roadmap-description"
      />
      <span className="text-muted-foreground pointer-events-none absolute right-2 bottom-1.5 text-xs tabular-nums">
        {value.length}/{DESCRIPTION_MAX_LENGTH}
      </span>
    </div>
  );
}
