"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Details = {
  status: "details";
  client?: { name: string; id?: string };
  client_id?: string;
  scope?: string;
  redirect_uri?: string;
};

type AlreadyConsented = {
  status: "already_consented";
  redirectUrl: string;
};

function ConsentForm() {
  const searchParams = useSearchParams();
  const authorizationId = searchParams.get("authorization_id");
  const [details, setDetails] = useState<Details | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authorizationId) {
      setError("Missing authorization request.");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`,
        );
        const data = (await res.json()) as (Details | AlreadyConsented) & { error?: string };
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
          setError(e instanceof Error ? e.message : "Could not load authorization details.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authorizationId]);

  const decide = async (decision: "approve" | "deny") => {
    if (!authorizationId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/oauth/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorization_id: authorizationId, decision }),
      });
      const data = (await res.json()) as { redirectUrl?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Consent request failed.");
      // Redirect target is Supabase-validated against the client's registered
      // redirect_uris (never user-supplied beyond the authorization_id flow).
      if (data.redirectUrl) window.location.href = data.redirectUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Consent request failed.");
      setBusy(false);
    }
  };

  if (error) {
    return (
      <main>
        <h1>Connect an agent</h1>
        {error === "no supabase session" ? (
          <p>
            Your account isn&apos;t linked to Supabase - sign in with your school email to
            connect an agent.
          </p>
        ) : (
          <p>{error}</p>
        )}
      </main>
    );
  }

  if (!details) {
    return (
      <main>
        <h1>Connect an agent</h1>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Connect an agent</h1>
      <p>
        <strong>{details.client?.name ?? "This app"}</strong> is requesting access to your
        account.
      </p>
      {(details.client_id ?? details.client?.id) && (
        <p>
          Client ID: <code>{details.client_id ?? details.client?.id}</code>
        </p>
      )}
      {details.redirect_uri && (
        <p>
          Redirect URI: <code>{details.redirect_uri}</code>
        </p>
      )}
      <p>
        <em>
          Warning: this is an unverified third-party application that will be able to read and
          modify your timetables, bids, and roadmaps.
        </em>
      </p>
      {details.scope && (
        <section>
          <h2>Requested access</h2>
          <ul>
            {details.scope
              .split(" ")
              .filter(Boolean)
              .map((s) => (
                <li key={s}>{s}</li>
              ))}
          </ul>
        </section>
      )}
      <button type="button" onClick={() => decide("approve")} disabled={busy}>
        Approve
      </button>
      <button type="button" onClick={() => decide("deny")} disabled={busy}>
        Deny
      </button>
    </main>
  );
}

export default function OAuthConsentPage() {
  // Suspense is required around useSearchParams (CSR bailout).
  return (
    <Suspense fallback={<main>Loading...</main>}>
      <ConsentForm />
    </Suspense>
  );
}
