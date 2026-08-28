"use client";

import { useState } from "react";
import { CheckIcon } from "lucide-react";
import { buildClaudeDeepLink, buildCursorDeepLink, buildVSCodeDeepLink, MCP_PUBLIC_URL } from "./connect-links";
import { ProviderLogo } from "./provider-logos";
import { cn } from "@/common/functions/index";

type ProviderId = "claude" | "chatgpt" | "gemini";

type Step = { label: string; href?: string };

const PROVIDERS: Record<
  ProviderId,
  { name: string; description: string; oneClickUrl?: (url: string) => string; steps: Step[] }
> = {
  claude: {
    name: "Claude",
    description: "Works on claude.ai (all plans) and Claude Desktop. One click, then approve in your browser.",
    oneClickUrl: (url) => buildClaudeDeepLink(url).toString(),
    steps: [
      { label: "Open Claude connectors" },
      { label: "Add custom connector" },
      { label: "Paste the URL below" },
      { label: "Approve" },
    ],
  },
  chatgpt: {
    name: "ChatGPT",
    description: "Requires Developer mode (Business/Enterprise/Edu for full access; Pro is read-only).",
    steps: [
      { label: "Enable Developer mode: Settings -> Security and login" },
      { label: "Open ChatGPT Plugins", href: "https://chatgpt.com/plugins" },
      { label: "+ -> paste the URL below" },
      { label: "Approve access" },
    ],
  },
  gemini: {
    name: "Gemini Spark",
    description: "Experimental: requires Google AI Pro/Ultra, US, personal account, Keep Activity on, English.",
    steps: [
      { label: "Open Connected Apps", href: "https://gemini.google.com/apps" },
      { label: "Add a custom app" },
      { label: "Paste the MCP server URL below" },
      { label: "Approve (OAuth) access" },
    ],
  },
};

export function ConnectFlow({ mcpUrl = MCP_PUBLIC_URL }: { mcpUrl?: string }) {
  const [selected, setSelected] = useState<ProviderId | null>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(mcpUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Pick a provider to connect your own AI agent via MCP - unlimited access on your own credits.
      </p>

      {/* Three branded buttons, light + dark */}
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
                "flex flex-col items-center gap-2 rounded-xl border bg-background p-4 transition-colors hover:bg-muted/50",
                active && "border-primary bg-muted/40",
              )}
            >
              <ProviderLogo id={id} />
              <span className="text-sm font-semibold">{PROVIDERS[id].name}</span>
            </button>
          );
        })}
      </div>

      {/* Expanded detail for the selected provider */}
      {selected && (
        <div className="rounded-xl border bg-muted/40 p-4 animate-in fade-in zoom-in-95 duration-150">
          <p className="mb-3 text-sm">{PROVIDERS[selected].description}</p>

          {PROVIDERS[selected].oneClickUrl ? (
            <>
              <a
                href={PROVIDERS[selected].oneClickUrl(mcpUrl)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
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
                          className="underline underline-offset-2 hover:text-foreground"
                        >
                          {s.label}
                        </a>
                      ) : (
                        s.label
                      )}
                    </li>
                  ))}
                </ol>
                <ManualUrl mcpUrl={mcpUrl} copied={copied} onCopy={copy} />
              </details>
            </>
          ) : (
            <>
              <ol className="text-muted-foreground list-decimal space-y-1 pl-5 text-sm">
                {PROVIDERS[selected].steps.map((s) => (
                  <li key={s.label}>
                    {s.href ? (
                      <a
                        href={s.href}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2 hover:text-foreground"
                      >
                        {s.label}
                      </a>
                    ) : (
                      s.label
                    )}
                  </li>
                ))}
              </ol>
              <ManualUrl mcpUrl={mcpUrl} copied={copied} onCopy={copy} />
            </>
          )}
        </div>
      )}

      <section className="border-t pt-3 text-sm">
        <h2 className="mb-2 font-semibold">Other agents (desktop)</h2>
        <div className="flex flex-wrap gap-2">
          <a href={buildCursorDeepLink(mcpUrl).toString()} className="rounded-full border px-3 py-1.5 hover:bg-muted">Install in Cursor</a>
          <a href={buildVSCodeDeepLink(mcpUrl).toString()} className="rounded-full border px-3 py-1.5 hover:bg-muted">Install in VS Code</a>
        </div>
      </section>
    </div>
  );
}

function ManualUrl({ mcpUrl, copied, onCopy }: { mcpUrl: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded border bg-background px-2 py-1 text-xs">{mcpUrl}</code>
      <button type="button" onClick={onCopy} className="shrink-0 rounded-full border px-3 py-1 text-xs hover:bg-muted">
        {copied ? <CheckIcon className="size-3.5" /> : "Copy URL"}
      </button>
    </div>
  );
}
