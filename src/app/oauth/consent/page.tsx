"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  ConsentCard,
  ConsentError,
  ConsentLoading,
  ConsentMissing,
  ConsentSignIn,
  Shell,
  type ConsentDetails,
} from "./consent-ui";

type AlreadyConsented = {
  status: "already_consented";
  redirectUrl: string;
};

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
        <ConsentMissing />
      </Shell>
    );
  }

  if (error) {
    if (error === "no supabase session") {
      const loginHref = `/account/auth/login?callbackUrl=${encodeURIComponent(`/oauth/consent?authorization_id=${authorizationId}`)}`;
      return (
        <Shell>
          <ConsentSignIn loginHref={loginHref} />
        </Shell>
      );
    }
    const retry = () => {
      setError(null);
      setAttempt((n) => n + 1);
    };
    return (
      <Shell>
        <ConsentError message={error} onRetry={retry} />
      </Shell>
    );
  }

  if (!details) {
    return (
      <Shell>
        <ConsentLoading />
      </Shell>
    );
  }

  return (
    <Shell>
      <ConsentCard
        details={details}
        busy={busy}
        onApprove={() => decide("approve")}
        onDeny={() => decide("deny")}
      />
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
