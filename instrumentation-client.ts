// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://81c51704b5a973abc295473c5b430131@o4508338523537408.ingest.us.sentry.io/4508338554208256",

  // Add optional integrations for additional features
  integrations: [
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
  ],

  // Continuous browser profiling was removed: no evidence of active use was
  // found in the repository. Re-add it with a reduced rate if flame graphs
  // are needed.

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Keep production sampling lower to control Sentry volume; development
  // remains full fidelity.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
