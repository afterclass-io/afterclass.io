"use client";

import { useState } from "react";
import { MCP_PUBLIC_URL, buildClaudeDeepLink } from "./connect-links";
import { ProviderLogo } from "./provider-logos";
import { cn } from "@/common/functions/index";

type ProviderId = "claude" | "chatgpt" | "gemini";

type Step = { label: string; href?: string };

const PROVIDERS: Record<
  ProviderId,
  {
    name: string;
    description: string;
    oneClickUrl?: (url: string) => string;
    steps: Step[];
  }
> = {
  claude: {
    name: "Claude",
    description:
      "Works on claude.ai (all plans) and Claude Desktop. One click, then approve in your browser.",
    oneClickUrl: (url) => buildClaudeDeepLink(url).toString(),
    steps: [
      { label: "Open Claude connectors" },
      { label: "Add custom connector" },
      { label: "Paste the MCP server URL from above" },
      { label: "Approve" },
    ],
  },
  chatgpt: {
    name: "ChatGPT",
    description:
      "Requires Developer mode (Business/Enterprise/Edu for full access; Pro is read-only).",
    steps: [
      { label: "Enable Developer mode: Settings -> Security and login" },
      { label: "Open ChatGPT Plugins", href: "https://chatgpt.com/plugins" },
      { label: "+ -> paste the MCP server URL from above" },
      { label: "Approve access" },
    ],
  },
  gemini: {
    name: "Gemini Spark",
    description:
      "Experimental: requires Google AI Pro/Ultra, US, personal account, Keep Activity on, English.",
    steps: [
      { label: "Open Connected Apps", href: "https://gemini.google.com/apps" },
      { label: "Add a custom app" },
      { label: "Paste the MCP server URL from above" },
      { label: "Approve (OAuth) access" },
    ],
  },
};

export function ConnectFlow({ mcpUrl = MCP_PUBLIC_URL }: { mcpUrl?: string }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        Pick a provider to connect your own AI agent via MCP - unlimited access
        on your own credits.
      </p>

      {/* Three branded buttons, light + dark */}
      <ProviderButtons mcpUrl={mcpUrl} />
    </div>
  );
}

function ProviderButtons({ mcpUrl }: { mcpUrl: string }) {
  const [selected, setSelected] = useState<ProviderId | null>(null);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(PROVIDERS) as ProviderId[]).map((id) => {
          const active = selected === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => setSelected(active ? null : id)}
              className={cn(
                "bg-background hover:bg-muted/50 flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors",
                active && "border-primary bg-muted/40",
              )}
            >
              <ProviderLogo id={id} />
              <span className="text-sm font-semibold">
                {PROVIDERS[id].name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Expanded detail for the selected provider */}
      {selected && (
        <div className="bg-muted/40 animate-in fade-in zoom-in-95 rounded-xl border p-4 duration-150">
          <p className="mb-3 text-sm">{PROVIDERS[selected].description}</p>

          {PROVIDERS[selected].oneClickUrl ? (
            <>
              <a
                href={PROVIDERS[selected].oneClickUrl(mcpUrl)}
                target="_blank"
                rel="noreferrer"
                className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold"
                data-umami-event="assistant-connect-oneclick"
              >
                One-click set up with {PROVIDERS[selected].name}
              </a>
              <details className="mt-3 text-sm">
                <summary className="text-muted-foreground cursor-pointer underline-offset-2 hover:underline">
                  or follow manual steps
                </summary>
                <ol className="text-muted-foreground mt-2 list-decimal space-y-1 pl-5">
                  {PROVIDERS[selected].steps.map((s) => (
                    <li key={s.label}>
                      {s.href ? (
                        <a
                          href={s.href}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-foreground underline underline-offset-2"
                        >
                          {s.label}
                        </a>
                      ) : (
                        s.label
                      )}
                    </li>
                  ))}
                </ol>
              </details>
            </>
          ) : (
            <ol className="text-muted-foreground list-decimal space-y-1 pl-5 text-sm">
              {PROVIDERS[selected].steps.map((s) => (
                <li key={s.label}>
                  {s.href ? (
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-foreground underline underline-offset-2"
                    >
                      {s.label}
                    </a>
                  ) : (
                    s.label
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </>
  );
}
