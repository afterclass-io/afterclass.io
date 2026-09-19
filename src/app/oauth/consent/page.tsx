"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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

export type AlreadyConsented = {
  status: "already_consented";
  redirectUrl: string;
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

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-10">
      {children}
    </main>
  );
}

function ConsentForm() {
  const searchParams = useSearchParams();
  const authorizationId = searchParams.get("authorization_id");
  const [details, setDetails] = useState<ConsentDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!authorizationId) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`,
        );
        const data = (await res.json()) as (
          ConsentDetails | AlreadyConsented
        ) & {
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || data.error) {
          setError(data.error ?? "Could not load authorization details.");
          return;
        }
        // Already consented - Supabase told us to redirect straight back to the client.
        // Redirect target is Supabase-validated against the client's registered
        // redirect_uris (never user-supplied beyond the authorization_id flow).
        if (data.status === "already_consented") {
          window.location.href = data.redirectUrl;
          return;
        }
        setDetails(data);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "Could not load authorization details.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authorizationId, attempt]);

  const decide = async (decision: "approve" | "deny") => {
    if (!authorizationId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/oauth/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // CSRF synchronizer token from the GET payload — the
        // route verifies it before approve/deny.
        body: JSON.stringify({
          authorization_id: authorizationId,
          decision,
          csrfToken: details?.csrfToken,
        }),
      });
      const data = (await res.json()) as {
        redirectUrl?: string;
        error?: string;
      };
      if (!res.ok || data.error)
        throw new Error(data.error ?? "Consent request failed.");
      // Redirect target is Supabase-validated against the client's registered
      // redirect_uris (never user-supplied beyond the authorization_id flow).
      if (data.redirectUrl) window.location.href = data.redirectUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Consent request failed.");
      setBusy(false);
    }
  };

  if (!authorizationId) {
    return (
      <Shell>
        <EmptyState
          title="Connect an agent"
          description="Missing authorization request."
        />
      </Shell>
    );
  }

  if (error) {
    if (error === "no supabase session") {
      const loginHref = `/account/auth/login?callbackUrl=${encodeURIComponent(`/oauth/consent?authorization_id=${authorizationId}`)}`;
      return (
        <Shell>
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
        </Shell>
      );
    }
    const retry = () => {
      setError(null);
      setAttempt((n) => n + 1);
    };
    return (
      <Shell>
        <EmptyState
          title="Connect an agent"
          description={error}
          action={<Button onClick={retry}>Retry</Button>}
        />
      </Shell>
    );
  }

  if (!details) {
    return (
      <Shell>
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
      </Shell>
    );
  }

  const clientName = details.client?.name ?? "This app";
  const scopes = (details.scope ?? "").split(" ").filter(Boolean);
  const clientId = details.client_id ?? details.client?.id;

  return (
    <Shell>
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
          <Button onClick={() => decide("approve")} disabled={busy}>
            {busy ? "Working…" : "Approve"}
          </Button>
          <Button
            variant="outline"
            onClick={() => decide("deny")}
            disabled={busy}
          >
            Deny
          </Button>
        </CardFooter>
      </Card>
    </Shell>
  );
}

export default function OAuthConsentPage() {
  // Suspense is required around useSearchParams (CSR bailout).
  return (
    <Suspense fallback={<Shell>Loading…</Shell>}>
      <ConsentForm />
    </Suspense>
  );
}
