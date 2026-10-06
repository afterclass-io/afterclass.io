import { z } from "zod";

import {
  MAX_LINK_LENGTH,
  MAX_MEETING_LINKS,
} from "@/modules/meetings/functions/meeting-limits";

const isHttpUrl = (value: string) => {
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
};

/** A list of web links attached to a meeting; only http(s) is accepted. */
export const meetingLinksSchema = z
  .array(
    z
      .string()
      .trim()
      .max(MAX_LINK_LENGTH)
      .refine(isHttpUrl, { message: "Enter a full link starting with https://" }),
  )
  .max(MAX_MEETING_LINKS);

/** Short label for a link: its host without a leading "www.". */
export function getLinkLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Turns free-typed link text into a clean list: one link per line, blanks
 * dropped, bare domains upgraded to https.
 */
export function parseLinkLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (/^[a-z][a-z0-9+.-]*:\/\//i.test(line) ? line : `https://${line}`));
}

export type AddLinksResult = {
  links: string[];
  /** Typed entries that are not valid web links, as the user typed them. */
  rejected: string[];
  /** True when valid links were dropped because the list is full. */
  overflow: boolean;
};

/**
 * Adds typed or pasted links to an existing list. Entries can be separated by
 * whitespace or commas, so pasting a whole block works. Duplicates are ignored.
 */
export function addLinksFromText(existing: string[], raw: string): AddLinksResult {
  const links = [...existing];
  const rejected: string[] = [];
  let overflow = false;

  for (const entry of raw.split(/[\s,]+/).filter(Boolean)) {
    const [normalised] = parseLinkLines(entry);
    const valid =
      normalised !== undefined &&
      normalised.length <= MAX_LINK_LENGTH &&
      isHttpUrl(normalised) &&
      normalised.includes(".");
    if (!valid) {
      rejected.push(entry);
    } else if (!links.includes(normalised)) {
      if (links.length >= MAX_MEETING_LINKS) overflow = true;
      else links.push(normalised);
    }
  }

  return { links, rejected, overflow };
}
