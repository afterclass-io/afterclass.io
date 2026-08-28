"use client";

import { LogInIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { WELCOME_SUGGESTIONS } from "./suggestions";

export function SignedOutPanel() {
  const pathname = usePathname();
  const callbackUrl = encodeURIComponent(pathname ?? "/");

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">How can I help you today?</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Ask about courses, professors, bid amounts, timetables and roadmaps.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {WELCOME_SUGGESTIONS.map((s) => (
          <span key={s.prompt} className="rounded-full border px-3.5 py-1.5 text-sm opacity-70">
            {s.label}
          </span>
        ))}
      </div>
      <a
        href={`/account/auth/login?callbackUrl=${callbackUrl}`}
        onClick={() => {
          try {
            sessionStorage.setItem("assistant-was-open", "1");
          } catch {
            // storage unavailable - non-fatal
          }
        }}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        data-umami-event="assistant-login-cta"
      >
        <LogInIcon className="size-4" />
        Log in to chat
      </a>
      <p className="text-muted-foreground max-w-56 text-xs">
        Free quota is 50 messages/month. Log in once - we&apos;ll bring you right back here.
      </p>
    </div>
  );
}
