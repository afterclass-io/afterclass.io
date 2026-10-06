"use client";

import { useState } from "react";
import { Link2, Plus, X } from "lucide-react";

import { Button } from "@/common/components/button";
import { Input } from "@/common/components/input";
import { Tag } from "@/common/components/tag";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/tooltip";
import { MAX_MEETING_LINKS } from "@/modules/meetings/functions/meeting-limits";
import {
  addLinksFromText,
  getLinkLabel,
} from "@/modules/meetings/functions/meeting-links";

export type MeetingLinksFieldProps = {
  value: string[];
  onChange: (links: string[]) => void;
  id?: string;
};

/**
 * Add links one at a time: type or paste, press Enter or Add, and each link
 * becomes a removable chip. Pasting several links at once splits them.
 */
export function MeetingLinksField({ value, onChange, id }: MeetingLinksFieldProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isFull = value.length >= MAX_MEETING_LINKS;

  const commit = () => {
    if (!draft.trim()) return;
    const { links, rejected, overflow } = addLinksFromText(value, draft);
    onChange(links);
    setDraft(rejected.join(" "));
    setError(
      rejected.length > 0
        ? `"${rejected[0]}" is not a valid link`
        : overflow
          ? `You can add up to ${MAX_MEETING_LINKS} links`
          : null,
    );
  };

  return (
    <div className="space-y-2" data-test="meeting-links-field">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Link2
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          />
          <Input
            id={id}
            value={draft}
            disabled={isFull}
            placeholder={
              isFull ? "Link limit reached" : "Paste a link"
            }
            aria-invalid={Boolean(error)}
            className="pl-8"
            onChange={(event) => {
              setDraft(event.target.value);
              setError(null);
            }}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit();
              }
            }}
            onPaste={(event) => {
              const text = event.clipboardData.getData("text");
              if (!/[\s,]/.test(text.trim())) return;
              event.preventDefault();
              const { links, rejected, overflow } = addLinksFromText(value, text);
              onChange(links);
              setDraft(rejected.join(" "));
              setError(
                overflow ? `You can add up to ${MAX_MEETING_LINKS} links` : null,
              );
            }}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={commit}
          disabled={isFull || !draft.trim()}
          className="gap-1"
          data-test="meeting-links-add"
        >
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      {error && <p className="text-destructive text-xs">{error}</p>}

      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((link) => (
            <li key={link}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Tag
                    size="sm"
                    variant="soft"
                    color="default"
                    deletable
                    onDelete={() => onChange(value.filter((item) => item !== link))}
                  >
                    {getLinkLabel(link)}
                  </Tag>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs break-all text-xs">
                  {link}
                </TooltipContent>
              </Tooltip>
            </li>
          ))}
        </ul>
      )}

      <p className="text-muted-foreground text-xs">
        {value.length}/{MAX_MEETING_LINKS} links. Press Enter to add; you can paste several at once.
      </p>
    </div>
  );
}
