import * as Sentry from "@sentry/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Adds Sentry spans and error capture to one Supabase client (#353).
 *
 * Call it on every client a factory creates: Sentry marks auth methods per
 * client instance, and the server builds a client per call. The app only uses
 * Supabase Auth, so spans carry the operation name (for example
 * `auth signInWithPassword`) and nothing else. `sendOperationData: false`
 * keeps query filters and request bodies out of events even if a future
 * caller uses PostgREST. Telemetry must never break sign-in, so a failure to
 * instrument is ignored.
 */
export function instrumentSupabase<T extends SupabaseClient>(client: T): T {
  try {
    Sentry.instrumentSupabaseClient(client, { sendOperationData: false });
  } catch {
    // The client still works without instrumentation.
  }
  return client;
}
