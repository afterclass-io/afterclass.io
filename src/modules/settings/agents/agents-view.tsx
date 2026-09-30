import { Bot, LogIn, Plug } from "lucide-react";

import { Button } from "@/common/components/button";
import { Card, CardContent, CardFooter } from "@/common/components/card";
import { EmptyState } from "@/common/components/empty-state";
import { PageTitle } from "@/common/components/page-title";
import { AgentRowIcon, RevokeAgentForm } from "./revoke-agent-form";

/** Minimal grant shape rendered by this view (see UserGrant in @/server/supabase-consent). */
export interface AgentGrant {
  id: string;
  client_id: string;
  client_name?: string;
  scopes: string[];
}

/** Server action injected by the page wrapper (Node-only, never bundled into stories). */
export type RevokeAction = (formData: FormData) => void | Promise<void>;

export type AgentsViewState =
  | { kind: "signed-out" }
  | { kind: "no-token" }
  | { kind: "error" }
  | { kind: "ready"; grants: AgentGrant[] };

function Title() {
  return (
    <PageTitle className="text-left text-2xl font-bold tracking-tight md:text-2xl!">
      Connected agents
    </PageTitle>
  );
}

export function AgentsView({
  state,
  revokeAction,
}: {
  state: AgentsViewState;
  revokeAction?: RevokeAction;
}) {
  switch (state.kind) {
    case "signed-out":
      return (
        <div className="flex max-w-full min-w-0 flex-col gap-4">
          <Title />
          <EmptyState
            icon={<LogIn />}
            title="Sign in to view your connected agents"
            description="Sign in with Google to manage your connected AI agents."
            action={
              <Button asChild>
                <a href="/account/auth/login?callbackUrl=%2Fmcp%2Fconnected-agents">
                  Sign in with Google
                </a>
              </Button>
            }
          />
        </div>
      );
    case "no-token":
      return (
        <div className="flex max-w-full min-w-0 flex-col gap-4">
          <Title />
          <EmptyState
            icon={<Plug />}
            title="Sign in with Google to connect an agent"
            description="If you just signed in, sign out and sign back in with Google, then try again."
            action={
              <Button asChild>
                <a href="/mcp">Connect your agent</a>
              </Button>
            }
          />
        </div>
      );
    case "error":
      return (
        <div role="alert" className="flex max-w-full min-w-0 flex-col gap-4">
          <Title />
          <EmptyState
            title="Could not load connected agents"
            description="Please sign out and sign back in, then try again."
          />
        </div>
      );
    case "ready":
      if (state.grants.length === 0) {
        return (
          <div className="flex max-w-full min-w-0 flex-col gap-4">
            <Title />
            <EmptyState
              icon={<Bot />}
              title="No agents connected yet"
              description="Connect your own AI agent (Claude, ChatGPT, or Gemini) to use afterclass.io on your own AI credits."
              action={
                <Button asChild>
                  <a href="/mcp">Connect your agent</a>
                </Button>
              }
            />
          </div>
        );
      }
      return (
        <div className="flex max-w-full min-w-0 flex-col gap-4">
          <Title />
          <p className="text-muted-foreground text-sm">
            These AI agents can access your afterclass.io data via MCP. Revoke
            any agent you no longer use.
          </p>
          <Card>
            <CardContent className="pt-6">
              <ul className="flex flex-col gap-2">
                {state.grants.map((g) => {
                  const name = g.client_name ?? "Connected agent";
                  return (
                    <li
                      key={g.client_id}
                      className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <AgentRowIcon />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {name}
                          </span>
                        </span>
                      </span>
                      <RevokeAgentForm
                        clientId={g.client_id}
                        name={name}
                        action={revokeAction}
                      />
                    </li>
                  );
                })}
              </ul>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" size="sm">
                <a href="/mcp">Connect another agent</a>
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
  }
}
