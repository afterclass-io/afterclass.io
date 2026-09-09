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

export function timetablePage(): string {
  return "/timetable";
}

export function roadmapsMinePage(): string {
  return "/roadmaps?view=mine";
}

export function exploreLinkFor(
  courseCodeInput?: string,
  sectionInput?: string,
  resolved?: { courseCode?: string; section?: string; classId?: string | null },
): string | null {
  if (courseCodeInput || sectionInput)
    return bidAnalytics({ courseCode: courseCodeInput, section: sectionInput });
  return bidAnalytics({
    courseCode: resolved?.courseCode,
    section: resolved?.section,
    classId: resolved?.classId ?? undefined,
  });
}
