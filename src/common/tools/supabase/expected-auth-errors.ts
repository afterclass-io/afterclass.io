/**
 * Supabase Auth messages that mean an ordinary user mistake. The Sentry
 * Supabase integration reports every auth error, so Sentry drops these.
 */
export const EXPECTED_SUPABASE_AUTH_ERRORS = [
  /Invalid login credentials/i,
  /Email not confirmed/i,
  /User already registered/i,
];
