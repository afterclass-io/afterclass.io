"use client";

import { useState } from "react";
import { ExternalLink, Pencil } from "lucide-react";

import { Button } from "@/common/components/button";
import { Textarea } from "@/common/components/textarea";
import { MeetingLinksField } from "@/modules/meetings/components/shared/MeetingLinksField";
import { MAX_AGENDA_LENGTH } from "@/modules/meetings/functions/meeting-limits";
import { getLinkLabel } from "@/modules/meetings/functions/meeting-links";

export type MeetingDetails = { agenda: string | null; links: string[] };

export type MeetingDetailsPanelProps = MeetingDetails & {
  canEdit: boolean;
  isSaving: boolean;
  onSave: (details: MeetingDetails) => void;
};

function DetailsView({ agenda, links }: MeetingDetails) {
  return (
    <div className="space-y-2 text-sm">
      {agenda && (
        <p className="whitespace-pre-wrap break-words">{agenda}</p>
      )}
      {links.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {links.map((link) => (
            <li key={link} className="max-w-full">
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:bg-accent inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium"
              >
                <span className="truncate">{getLinkLabel(link)}</span>
                <ExternalLink className="size-3 shrink-0" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DetailsForm({
  agenda,
  links,
  isSaving,
  onSave,
  onCancel,
}: MeetingDetails & {
  isSaving: boolean;
  onSave: (details: MeetingDetails) => void;
  onCancel: () => void;
}) {
  const [agendaText, setAgendaText] = useState(agenda ?? "");
  const [linkList, setLinkList] = useState(links);

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ agenda: agendaText.trim() || null, links: linkList });
      }}
    >
      <Textarea
        value={agendaText}
        onChange={(event) => setAgendaText(event.target.value)}
        placeholder="What is this meeting for?"
        aria-label="Agenda"
        maxLength={MAX_AGENDA_LENGTH}
        rows={4}
        className="min-h-0 resize-none text-sm"
      />
      <MeetingLinksField value={linkList} onChange={setLinkList} />
      <div className="flex justify-end gap-1.5">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSaving}>
          Save
        </Button>
      </div>
    </form>
  );
}

/** Agenda and links for a meeting. Only the creator sees the edit control. */
export function MeetingDetailsPanel({
  agenda,
  links,
  canEdit,
  isSaving,
  onSave,
}: MeetingDetailsPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const isEmpty = !agenda && links.length === 0;

  if (isEmpty && !canEdit) return null;

  return (
    <section
      className="bg-card space-y-2 rounded-xl border p-3"
      data-test="meeting-details"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Agenda &amp; links</h2>
        {canEdit && !isEditing && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Edit agenda and links"
            onClick={() => setIsEditing(true)}
            data-test="meeting-details-edit"
          >
            <Pencil className="size-3.5" />
          </Button>
        )}
      </div>

      {isEditing ? (
        <DetailsForm
          agenda={agenda}
          links={links}
          isSaving={isSaving}
          onCancel={() => setIsEditing(false)}
          onSave={(details) => {
            onSave(details);
            setIsEditing(false);
          }}
        />
      ) : isEmpty ? (
        <p className="text-muted-foreground text-xs">
          Add an agenda or links so everyone knows what to prepare.
        </p>
      ) : (
        <DetailsView agenda={agenda} links={links} />
      )}
    </section>
  );
}
