// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://81c51704b5a973abc295473c5b430131@o4508338523537408.ingest.us.sentry.io/4508338554208256",

  // Task 9: 0.1 in production (1.0 trace sampling on every serverless
  // invocation is a cost + quota burn); keep 1.0 in dev for full fidelity.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  integrations: [Sentry.prismaIntegration()],
  ignoreErrors: [/^UNAUTHORIZED$/, /AbortError/i],
});
