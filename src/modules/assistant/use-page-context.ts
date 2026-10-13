"use client";
import { usePathname, useSearchParams } from "next/navigation";
import type { PageContext } from "@/common/types/assistant";

const PARAM_MAP = {
  course: "course",
  section: "section",
  classId: "classId",
  prof: "profSlug",
} as const;

export const PAGE_CONTEXT_MAX_LEN = 120;

export function usePageContext(): PageContext | null {
  const pathname = usePathname();
  const params = useSearchParams();
  if (!pathname || pathname.startsWith("/assistant")) return null;
  const ctx: PageContext = { pathname };

  const meetingMatch = /^\/meetings\/([a-zA-Z0-9_-]+)/.exec(pathname);
  if (meetingMatch?.[1] && meetingMatch[1] !== "new") {
    ctx.meetingSlug = meetingMatch[1].slice(0, PAGE_CONTEXT_MAX_LEN);
  }

  for (const [param, key] of Object.entries(PARAM_MAP)) {
    const v = params?.get(param)?.trim();
    if (v) ctx[key] = v.slice(0, PAGE_CONTEXT_MAX_LEN);
  }
  return ctx;
}
