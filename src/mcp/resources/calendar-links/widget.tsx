import { useState } from "react";
import { useWidget, type WidgetMetadata } from "mcp-use/react";
import { z } from "zod";

import { Skeleton, TOKENS } from "../shared/tokens";

const calendarLinksPropsSchema = z.object({
  feedUrl: z.string(),
  subscribeUrl: z.string(),
  googleSubscribeUrl: z.string(),
  appleSubscribeUrl: z.string(),
  outlookSubscribeUrl: z.string(),
  madeLinkShareable: z.boolean().optional(),
});

export const widgetMetadata: WidgetMetadata = {
  description: "Calendar subscribe links for a timetable",
  props: calendarLinksPropsSchema,
};

const CalendarLinks: React.FC = () => {
  const { props, isPending, theme } = useWidget<
    z.infer<typeof calendarLinksPropsSchema>
  >() as unknown as {
    props: z.infer<typeof calendarLinksPropsSchema>;
    isPending: boolean;
    theme: string;
  };
  const dark = theme === "dark";
  const c = dark ? TOKENS.dark : TOKENS.light;
  const [copied, setCopied] = useState(false);
  if (isPending) return <Skeleton dark={dark} />;
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
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <a
          href={props.googleSubscribeUrl}
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
          href={props.appleSubscribeUrl}
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
          href={props.outlookSubscribeUrl}
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
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={props.feedUrl}
          readOnly
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
          onClick={() => {
            void navigator.clipboard.writeText(props.feedUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
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
      <div style={{ fontSize: 11, color: c.mutedFg, marginTop: 8, lineHeight: 1.5 }}>
        Subscribed calendars update automatically when your timetable changes.
      </div>
      {props.madeLinkShareable && (
        <div style={{ fontSize: 11, color: c.mutedFg, marginTop: 6, lineHeight: 1.5 }}>
          Link-sharing was turned on for this timetable (anyone with the link can view it).
        </div>
      )}
    </div>
  );
};

export default CalendarLinks;
