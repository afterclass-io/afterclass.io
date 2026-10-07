import { env } from "@/env";

export function coursePage(code: string): string {
  return `/course/${encodeURIComponent(code)}`;
}

export function professorPage(slug: string): string {
  return `/professor/${encodeURIComponent(slug)}`;
}

export function searchPage(query: string): string {
  return `/search?q=${encodeURIComponent(query)}`;
}

export function bidAnalytics(params: {
  courseCode?: string;
  section?: string;
  classId?: string;
}): string | null {
  const parts: string[] = [];
  if (params.courseCode)
    parts.push(`course=${encodeURIComponent(params.courseCode)}`);
  if (params.section)
    parts.push(`section=${encodeURIComponent(params.section)}`);
  if (params.classId)
    parts.push(`classId=${encodeURIComponent(params.classId)}`);
  return parts.length > 0 ? `/bidding/analytics?${parts.join("&")}` : null;
}

export function absoluteUrl(path: string): string {
  return `${env.NEXT_PUBLIC_SITE_URL}${path}`;
}

/** Tool-description sentence for tools that return a page `url`: agents must
 * relay it verbatim (older turns' tool results are pruned, so a model that
 * paraphrases invents paths such as `/rsvp`). */
export const PAGE_LINK_NOTE =
  "To link the page, use the returned url exactly as given (it is already absolute); never build or guess other page URLs.";

export function timetablePage(): string {
  return "/timetable";
}

export function roadmapsMinePage(): string {
  return "/roadmaps?view=mine";
}

export function meetingPage(slug: string): string {
  return `/meetings/${encodeURIComponent(slug)}`;
}

export function exploreLinkFor(
  courseCodeInput?: string,
  sectionInput?: string,
  resolved?: { courseCode?: string; section?: string; classId?: string | null },
): string | null {
  if (courseCodeInput || sectionInput)
    return bidAnalytics({
      courseCode: courseCodeInput,
      section: sectionInput,
      classId: resolved?.classId ?? undefined,
    });
  return bidAnalytics({
    courseCode: resolved?.courseCode,
    section: resolved?.section,
    classId: resolved?.classId ?? undefined,
  });
}
