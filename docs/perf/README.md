# Performance measurement

This directory holds the Core Web Vitals baseline and the procedure to repeat
it. Tracked in #504. Each result file names the build SHA it measured.

## What is measured

| Source             | Metrics                      | Where it lives                                            |
| ------------------ | ---------------------------- | --------------------------------------------------------- |
| Lighthouse (lab)   | TTFB, FCP, LCP, TBT, CLS, SI | `scripts/perf/lighthouse-median.ts`                       |
| Production build   | First-load JS per route      | `scripts/perf/bundle-size.ts` (reads `.next/diagnostics`) |
| Field (real users) | LCP, INP, CLS                | Umami event `web-vital`, sent by `WebVitalsReporter`      |

INP needs a real interaction, so Lighthouse cannot measure it. Use TBT as the
lab proxy and read INP from the field events.

## Reproduce the lab baseline

Use a production build, never `next dev`. Run these steps in order.

1. Start the local database (`docker compose up -d`) and check that `.env`
   points at it. The seed data must hold at least one course.
2. Build: `npx next build`. Record `git rev-parse --short HEAD`.
3. Print bundle sizes: `bun run scripts/perf/bundle-size.ts`.
4. Start the server: `AUTH_TRUST_HOST=true npx next start -p 3000`. The flag
   stops Auth.js from rejecting `localhost`. Do not start a second server on a
   used port.
5. Run Lighthouse (it downloads the pinned `lighthouse@12.8.2` through `npx`):

   ```sh
   # Mobile preset: 412 px viewport, simulated 4x CPU slowdown,
   # 150 ms RTT, 1.6 Mbit/s down. Median of 3 runs per route.
   CHROME_PATH="<path to chrome>" \
     bun run scripts/perf/lighthouse-median.ts http://localhost:3000 3

   # Laptop width, below the 1250 px sidebar breakpoint.
   VIEWPORT=1024x768 CHROME_PATH="<path to chrome>" \
     bun run scripts/perf/lighthouse-median.ts http://localhost:3000 3
   ```

   Pass paths after the run count to measure other routes. On Git Bash for
   Windows, set `MSYS_NO_PATHCONV=1` so `/` is not rewritten to a Windows path.

6. Write the numbers, the SHA, the Lighthouse version and the throttling
   profile into a new `docs/perf/<date>-<topic>.md` file.

Lab numbers vary between machines. Compare only runs made on the same
machine, with the same profile, and report the median of at least 3 runs.

## Field vitals

`WebVitalsReporter` (mounted in the root layout) uses the Next.js
`useReportWebVitals` hook. It sends one Umami event per metric:

- Event name: `web-vital`
- Properties: `metric` (`LCP`, `INP` or `CLS`), `value` (ms, or a unitless
  score for CLS), `rating` (`good`, `needs-improvement`, `poor`),
  `navigation` (the navigation type).

The event holds no user id, no email and no review text. Umami adds the page
URL and its own anonymous session to every event, as it does for page views.

To read the p75: open the Umami dashboard, then Events, then the `web-vital`
event, then group by property `metric` and read the `value` distribution. The
Core Web Vitals targets at p75 are LCP 2500 ms, INP 200 ms and CLS 0.1.

## Invariants

`src/common/performance-invariants.test.ts` pins decisions that have no
runtime seam. It reads source files from disk. Each performance change under
#502 adds its own `describe` block there.
