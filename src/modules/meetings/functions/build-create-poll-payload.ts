import type { RouterInputs } from "@/common/tools/trpc/react";

export type CreatePollFormValues = {
  title: string;
  agenda?: string;
  /** Normalised http(s) links, already split by the links field. */
  links?: string[];
  startDate: string;
  endDate: string;
  startHour: number;
  endHour: number;
  courseId?: string;
  section?: string;
  teamIdentifier?: string;
};

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed;
}

/**
 * Maps form state to the `createPoll` input. Blank optional fields become
 * `null`; an empty-string id must never reach the server, where it would fail
 * UUID validation.
 */
export function buildCreatePollPayload(
  values: CreatePollFormValues,
): RouterInputs["meetings"]["createPoll"] {
  return {
    title: values.title.trim(),
    agenda: emptyToNull(values.agenda),
    links: values.links ?? [],
    startDate: values.startDate,
    endDate: values.endDate,
    startHour: values.startHour,
    endHour: values.endHour,
    courseId: emptyToNull(values.courseId),
    section: emptyToNull(values.section),
    teamIdentifier: emptyToNull(values.teamIdentifier),
  };
}
