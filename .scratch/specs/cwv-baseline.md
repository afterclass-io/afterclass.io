# Core Web Vitals baseline (#504)

Baseline for the P-1 measurement work in
[`cwv-remediation.md`](./cwv-remediation.md). This file is the before half of
the before-and-after: re-run this procedure after remediation work lands and
record the numbers in the same table.

## Build under test

| Field         | Value                                                  |
| ------------- | ------------------------------------------------------ |
| Branch        | `perf/improve-cwv`                                     |
| Build SHA     | `a18c67835e2dab159fd01647902468de7e8ecfcc`             |
| Build command | `pnpm build` (`next build`)                            |
| Serve command | `pnpm start` (`next start`) on `http://localhost:3000` |

> The working tree carried uncommitted parallel-agent changes when this SHA
> was recorded. Re-run with the SHA of whatever commit you are actually
> measuring.

## Routes

| Route                | What it is                                     | Auth needed    |
| -------------------- | ---------------------------------------------- | -------------- |
| `/`                  | Home feed (reviews feed, parallel-route slots) | No             |
| `/course/{code}`     | A course page, e.g. `/course/is111`            | No             |
| `/bidding/analytics` | Bidding analytics                              | School session |

## Procedure (reproducible)

1. `git rev-parse HEAD` and record the SHA in the table above.
2. `pnpm build && pnpm start` — measure against a production build, never `next dev`.
3. Lighthouse CLI against `http://localhost:3000` for each route:
   `npx lighthouse http://localhost:3000/course/is111 --output=json --output-path=...`
4. Throttling profile: **Lighthouse default mobile preset** — Moto G Power
   emulation, simulated **Slow 4G** (150 ms RTT, 1.6 Mbps down, 750 Kbps up),
   **4x CPU slowdown**. Do not pass `--preset=desktop` or disable throttling.
5. Run each route **3 times**, record the **median** per metric, signed-in
   where the route requires it (bidding analytics).
6. Copy the LCP, INP, CLS, TTFB and total-blocking-time (TBT) numbers into the
   table below, alongside the SHA and throttling profile, and commit.

## Baseline numbers

Not measured in this environment: no Lighthouse CLI installed, no production
server/DB available to serve the data-heavy routes, and the working tree is
shared with parallel agents. Follow the procedure above to fill the table.
Every cell is TODO until a real run replaces it — never trust an estimated CWV.

| Metric    | `/`  | `/course/is111` | `/bidding/analytics` |
| --------- | ---- | --------------- | -------------------- |
| LCP (s)   | TODO | TODO            | TODO                 |
| INP (ms)  | TODO | TODO            | TODO                 |
| CLS       | TODO | TODO            | TODO                 |
| TTFB (ms) | TODO | TODO            | TODO                 |
| TBT (ms)  | TODO | TODO            | TODO                 |

Good/bad thresholds (for reading the table, not commitments — see
`cwv-remediation.md` "Out of Scope"): LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1,
TTFB ≤ 800 ms.

## Field telemetry (live)

Field vitals are reported continuously from the client to the existing Umami
analytics sink (no new dependency), via
`src/common/components/web-vitals-reporter.tsx` mounted in the root layout:

- Umami event name: `web-vitals`
- Event data: `metric` (`LCP` | `INP` | `CLS`), `value` (ms or score as
  reported by `next/web-vitals`), `id` (the metric's unique id)
- Visible in the Umami dashboard under Events → `web-vitals`, grouped by
  `metric`. Umami tracks LCP in ms (its web-vitals plugin convention), so
  compare LCP values with that unit in mind.

Pinned by `src/common/perf/perf-invariants.test.ts` (Seam A pattern, per
`cwv-remediation.md` Testing Decisions).
