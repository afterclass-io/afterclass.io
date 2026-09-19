"use client";

import { ShieldCheck } from "lucide-react";

import { Button } from "@/common/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/common/components/card";
import { EmptyState } from "@/common/components/empty-state";
import { Skeleton } from "@/common/components/skeleton";

export type ConsentDetails = {
  status: "details";
  client?: { name: string; id?: string };
  client_id?: string;
  scope?: string;
  redirect_uri?: string;
  csrfToken?: string;
};

const SCOPE_LABELS: Record<string, string> = {
  openid: "Verify your identity",
  email: "Email address",
  profile: "Name and profile photo",
  phone: "Phone number",
  offline_access: "Stay connected when you're away",
};

/** Plain-language label for an OAuth scope; unknown scopes pass through. */
export function scopeLabel(scope: string): string {
  return SCOPE_LABELS[scope] ?? scope;
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-10">
      {children}
    </main>
  );
}

/** Approve/deny card for a loaded authorization request (pure, storyable). */
export function ConsentCard({
  details,
  busy = false,
  onApprove,
  onDeny,
}: {
  details: ConsentDetails;
  busy?: boolean;
  onApprove: () => void;
  onDeny: () => void;
}) {
  const clientName = details.client?.name ?? "This app";
  const scopes = (details.scope ?? "").split(" ").filter(Boolean);
  const clientId = details.client_id ?? details.client?.id;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect an agent</CardTitle>
        <CardDescription>
          <strong>{clientName}</strong> is requesting access to your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          This is an unverified third-party application that will be able to
          read and modify your timetables, bids, and roadmaps.
        </p>
        {scopes.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold">Requested access</h2>
            <ul className="flex flex-col gap-1 text-sm">
              {scopes.map((s) => (
                <li key={s}>{scopeLabel(s)}</li>
              ))}
            </ul>
          </section>
        )}
        {(clientId ?? details.redirect_uri) && (
          <details className="text-muted-foreground text-xs">
            <summary className="cursor-pointer underline-offset-2 hover:underline">
              Advanced details
            </summary>
            {clientId && (
              <p className="mt-1">
                Client ID: <code>{clientId}</code>
              </p>
            )}
            {details.redirect_uri && (
              <p className="mt-1">
                Redirect URI: <code>{details.redirect_uri}</code>
              </p>
            )}
          </details>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button onClick={onApprove} disabled={busy}>
          {busy ? "Working…" : "Approve"}
        </Button>
        <Button variant="outline" onClick={onDeny} disabled={busy}>
          Deny
        </Button>
      </CardFooter>
    </Card>
  );
}

/** Skeleton while authorization details load (pure, storyable). */
export function ConsentLoading() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}

/** Sign-in prompt when no Supabase session exists (pure, storyable). */
export function ConsentSignIn({ loginHref }: { loginHref: string }) {
  return (
    <EmptyState
      icon={<ShieldCheck />}
      title="Sign in to continue"
      description="Sign in with Google to connect an AI agent."
      action={
        <a href={loginHref}>
          <Button>Sign in with Google</Button>
        </a>
      }
    />
  );
}

/** Generic error with retry (pure, storyable). */
export function ConsentError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <EmptyState
      title="Connect an agent"
      description={message}
      action={<Button onClick={onRetry}>Retry</Button>}
    />
  );
}

/** Missing authorization_id state (pure, storyable). */
export function ConsentMissing() {
  return (
    <EmptyState
      title="Connect an agent"
      description="Missing authorization request."
    />
  );
}
