import { useEffect, useRef, useState } from "react";
import type React from "react";
import type { ViewConfig } from "mcp-use/react";
import { useToolContext, useViewTheme } from "mcp-use/react";
import type { CalendarLinksMeta } from "../../view-tools/schemas";
import { Skeleton, TOKENS } from "../shared/tokens";

/**
 * MCP App View (mcp-use v2) for the `get-timetable-calendar-link` tool. Must
 * stay dependency-free: no `@/server/*`, no `next/*`.
 *
 * The subscribe buttons, copyable feed input and tokens are copied verbatim
 * from the v1 `resources/calendar-links/widget.tsx`; only the data channels
 * changed:
 *
 *   v1 useWidget().props.{urls}     -> v2 useToolContext().meta (View-only!)
 *   v1 useWidget().props.madeLinkShareable
 *                                   -> v2 useToolContext().toolOutput.madeLinkShareable
 *   v1 useWidget().isPending        -> v2 status === "pending"
 *   v1 useWidget().theme            -> v2 useViewTheme()
 *   v1 widgetMetadata export        -> v2 viewConfig export
 *
 * SECRET ISOLATION: the bearer-bearing URLs ({feedUrl, subscribeUrl,
 * googleSubscribeUrl, appleSubscribeUrl, outlookSubscribeUrl}) live ONLY in
 * the result `_meta` (View-only channel) — they are NEVER in
 * `structuredContent` (toolOutput, which the model sees) nor in text content.
 */

export const viewConfig = {
  autoResize: true,
  displayModes: ["inline", "fullscreen", "pip"],
} satisfies ViewConfig;

const CalendarLinksView: React.FC = () => {
  const { status, toolOutput, meta, error } =
    useToolContext<"get-timetable-calendar-link">();
  const theme = useViewTheme();
  const dark = theme === "dark";
  const c = dark ? TOKENS.dark : TOKENS.light;
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
  if (status === "pending") return <Skeleton dark={dark} />;
  if (status === "error") {
    return (
      <div
        role="alert"
        style={{
          fontFamily: "var(--font-inter, ui-sans-serif, system-ui)",
          color: c.cardFg,
          background: c.card,
          border: `1px solid ${c.border}`,
          borderRadius: c.radius,
          padding: 16,
        }}
      >
        {error.message}
      </div>
    );
  }
  // URLs come from the View-only `_meta` channel, never from toolOutput
  // (structuredContent is what the model sees and holds no secrets).
  const urls = meta as CalendarLinksMeta | undefined;
  const feedUrl = urls?.feedUrl ?? "";
  const googleSubscribeUrl = urls?.googleSubscribeUrl ?? "";
  const appleSubscribeUrl = urls?.appleSubscribeUrl ?? "";
  const outlookSubscribeUrl = urls?.outlookSubscribeUrl ?? "";
  const madeLinkShareable =
    (toolOutput as { madeLinkShareable?: boolean } | undefined)
      ?.madeLinkShareable === true;
  return (
    <div
      style={{
        fontFamily: "var(--font-inter, ui-sans-serif, system-ui)",
        color: c.cardFg,
        background: c.card,
        border: `1px solid ${c.border}`,
        borderRadius: c.radius,
        padding: 16,
        boxSizing: "border-box",
        maxWidth: 480,
      }}
    >
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
        Add timetable to your calendar
      </div>
      {!urls && (
        <div
          style={{
            fontSize: 12,
            color: c.mutedFg,
            border: `1px dashed ${c.border}`,
            borderRadius: c.radius,
            padding: 12,
            marginBottom: 12,
            lineHeight: 1.5,
          }}
        >
          Calendar links are unavailable for this timetable. Ask the assistant
          to generate a calendar link and try again.
        </div>
      )}
      {urls && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <a
          href={googleSubscribeUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "6px 14px",
            borderRadius: 9999,
            border: "none",
            background: c.primary,
            color: c.primaryFg,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          Google Calendar
        </a>
        <a
          href={appleSubscribeUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "6px 14px",
            borderRadius: 9999,
            border: `1px solid ${c.primary}`,
            background: c.card,
            color: c.primary,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          Apple Calendar
        </a>
        <a
          href={outlookSubscribeUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "6px 14px",
            borderRadius: 9999,
            border: `1px solid ${c.primary}`,
            background: c.card,
            color: c.primary,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          Outlook
        </a>
        </div>
      )}
      {urls && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={feedUrl}
          readOnly
          aria-label="Calendar feed URL"
          style={{
            flex: 1,
            padding: "6px 10px",
            borderRadius: 6,
            border: `1px solid ${c.border}`,
            background: dark ? "oklch(0.274 0.006 286.033)" : "white",
            color: c.cardFg,
            fontSize: 12,
            fontFamily: "var(--font-geist-mono, ui-monospace)",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        />
        <button
          type="button"
          aria-live="polite"
          onClick={() => {
            navigator.clipboard
              .writeText(feedUrl)
              .then(() => {
                setCopied(true);
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => setCopied(false), 2000);
              })
              .catch(() => {
                // clipboard unavailable (non-secure context) — non-fatal
              });
          }}
          style={{
            padding: "6px 14px",
            borderRadius: 9999,
            border: `1px solid ${c.primary}`,
            background: copied ? c.primary : c.card,
            color: copied ? c.primaryFg : c.primary,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
        </div>
      )}
      <div style={{ fontSize: 11, color: c.mutedFg, marginTop: 8, lineHeight: 1.5 }}>
        Subscribed calendars update automatically when your timetable changes.
      </div>
      {madeLinkShareable && (
        <div style={{ fontSize: 11, color: c.mutedFg, marginTop: 6, lineHeight: 1.5 }}>
          Link-sharing was turned on for this timetable (anyone with the link can view it).
        </div>
      )}
    </div>
  );
};

export default CalendarLinksView;
