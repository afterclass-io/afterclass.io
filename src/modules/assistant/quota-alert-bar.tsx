"use client";

import { XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/common/functions/index";
import { getQuotaAlert } from "./quota-alert";

const DISMISS_KEY = "ac:assistant:alert-dismissed:v1";

export function QuotaAlertBar({
  remaining,
  quota,
  hasConnectedAgent,
}: {
  remaining: number;
  quota: number;
  hasConnectedAgent: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY)) setDismissed(true);
    } catch {
      // storage unavailable - non-fatal
    }
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // storage unavailable - non-fatal
    }
  };

  const alert = hasConnectedAgent ? null : getQuotaAlert(remaining, quota);
  if (!alert || dismissed) return null;

  const message =
    alert.remaining <= 0
      ? "You've used all your free messages this month."
      : `You've used ${100 - alert.pct}% of your free messages this month.`;

  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-between gap-2 px-3 py-1.5 text-xs animate-in fade-in slide-in-from-bottom-1 duration-150",
        alert.level === "critical" ? "bg-red-500/10" : "bg-amber-500/10",
      )}
    >
      <p className={cn(alert.level === "critical" ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400")}>
        {message}{" "}
        <a
          href="/settings/agents/connect"
          className="font-semibold underline underline-offset-2"
          data-umami-event="assistant-quota-alert-connect"
        >
          Connect your AI agent for unlimited.
        </a>
      </p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className={cn(
          "rounded p-0.5",
          alert.level === "critical" ? "hover:bg-red-500/20" : "hover:bg-amber-500/20",
        )}
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  );
}
