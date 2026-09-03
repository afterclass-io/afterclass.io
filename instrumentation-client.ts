// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://81c51704b5a973abc295473c5b430131@o4508338523537408.ingest.us.sentry.io/4508338554208256",

  // Add optional integrations for additional features
  integrations: [
    // Privacy (#505): the site's core content is student-written reviews, so
    // replay must mask all text and block all media.
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
  ],

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  // Full rate in development, reduced in production (#505).
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Continuous JS profiling (browserProfilingIntegration) was removed (#505):
  // no evidence anyone reads the profiling product, so the Document-Policy
  // js-profiling header in next.config.js went with it. profilesSampleRate
  // stays env-gated (reduced in production) so re-enabling the integration
  // later cannot ship full-rate profiling by accident.
  profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
