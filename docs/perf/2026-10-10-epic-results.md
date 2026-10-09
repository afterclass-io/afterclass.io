# Performance epic results, 2026-10-10

Tracked under #502. This file records the "after" numbers for the changes
that follow the baseline in `2026-10-09-baseline.md`. Same machine, same
procedure as `README.md`, production build, `next start -p 3000`.

## Conditions

| Item         | Value                                                                                   |
| ------------ | --------------------------------------------------------------------------------------- |
| Baseline SHA | `c30572d9` (see `2026-10-09-baseline.md`)                                               |
| "Before" SHA | `435755d8`: baseline plus #504, #506, #514, #517, #518, #519 and #522                   |
| "After" SHA  | `12378fd3`: before plus #521, #516 and #523                                             |
| Tool         | Lighthouse 12.8.2, performance category, median of 3 runs                               |
| Profile      | Mobile preset (412 px, 4x CPU slowdown, 150 ms RTT, 1.6 Mbit/s) unless stated           |
| Data         | Local Postgres with the seed data. Queries answer in a few milliseconds.                |
| Limit        | No signed-in session was available, so every browser number is for a signed-out viewer. |

## Bundle size (#514)

First-load JavaScript per route and emitted client assets, from
`bun run scripts/perf/bundle-size.ts`.

| Metric                          | Baseline `c30572d9` | Now `12378fd3`     |
| ------------------------------- | ------------------- | ------------------ |
| `/` raw / gzip                  | 2504.0 / 746.4 KiB  | 2522.8 / 754.1 KiB |
| `/course/[code]` raw / gzip     | 2532.4 / 756.0 KiB  | 2551.2 / 763.6 KiB |
| `/bidding/analytics` raw / gzip | 2423.3 / 722.5 KiB  | 2446.3 / 731.4 KiB |
| `.next/static` JavaScript       | 4541.1 KiB          | 4561.9 KiB         |
| `.next/static` CSS              | 163.9 KiB           | 158.4 KiB          |
| Fonts and media                 | 543.6 KiB           | 12.6 KiB           |

First-load JavaScript grew by about 19 to 23 KiB per route. The growth comes
from the `next/image` client code (#522) and the field vitals reporter (#504).
`removeConsole` keeps `log`, because the assistant usage line and the MCP
write-audit line are operational records, so it saves little. Fonts and media
fell by 531 KiB (#506). `optimizePackageImports` did not change the route
totals.

## Lab vitals, mobile profile (#516, #521, #523)

Each cell reads before, then after.

| Route                | TTFB (ms) | FCP (ms)   | LCP (ms)   | TBT (ms) | CLS          |
| -------------------- | --------- | ---------- | ---------- | -------- | ------------ |
| `/`                  | 73, 38    | 1092, 1155 | 8207, 6310 | 943, 719 | 0.183, 0.000 |
| `/course/IS215`      | 67, 48    | 1269, 1282 | 7151, 6564 | 851, 920 | 0.000, 0.000 |
| `/professor/...`     | 50, 37    | 1282, 1323 | 7186, 6437 | 804, 739 | 0.000, 0.000 |
| `/bidding`           | 61, 24    | 1188, 1152 | 5605, 7114 | 736, 853 | 0.000, 0.000 |
| `/bidding/analytics` | 55, 32    | 1141, 1215 | 5805, 6861 | 757, 888 | 0.000, 0.000 |
| `/search?q=IS215`    | 46, 27    | 1131, 1207 | 5487, 5521 | 715, 794 | 0.000, 0.000 |
| `/roadmaps`          | 19, 24    | 1152, 1128 | 8296, 8384 | 760, 906 | 0.002, 0.002 |
| `/submit`            | 5, 5      | 1430, 1435 | 7900, 8060 | 675, 709 | 0.008, 0.008 |

Notes:

- `/` showed CLS 0.183 at the "before" SHA, against 0.000 in the baseline.
  The cause is the skeleton swap after hydration. #516 removes that phase: the
  server now renders the first page of reviews. The same run holds LCP down by
  1.9 s.
- The mobile preset simulates throttling, so TBT and LCP move by 100 to 300 ms
  between identical runs. Differences below that are noise.
- CLS is 0.000 on `/`, the course page, `/bidding`, `/bidding/analytics`
  (class picker and class view) and `/search` at 1400 x 900 as well.

## Streaming shell (#523), no throttling

Lighthouse with `--throttling-method=provided`, median of 3. Each cell reads
before, then after.

| Route                | TTFB (ms) | FCP (ms) | LCP (ms) | CLS          |
| -------------------- | --------- | -------- | -------- | ------------ |
| `/bidding`           | 67, 21    | 455, 233 | 455, 583 | 0.000, 0.000 |
| `/bidding/analytics` | 67, 32    | 342, 267 | 342, 578 | 0.000, 0.000 |
| `/search?q=IS215`    | 37, 23    | 231, 234 | 231, 234 | 0.000, 0.000 |

The shell arrives sooner, and the content arrives about 130 to 240 ms later,
because React batches the reveal of a streamed boundary. A local database
answers in a few milliseconds, so there is little to hide here. Repeat this
measurement against the production database before relying on it. The
served HTML for all three routes holds the fallback markers and the `$RC`
swap scripts, which shows the shell is sent first.

## Query counts (#521)

Counted from the Prisma query log of `next dev`, per request.

| Page                         | SQL statements before | SQL statements after |
| ---------------------------- | --------------------- | -------------------- |
| `/course/IS215`              | 17                    | 17                   |
| `/professor/yixin-cao`       | 9                     | 9                    |
| `/search?q=...` (signed out) | 2                     | 2                    |

- Course lookups per course page render: 3 (`@header`, `@information`,
  `getCoursePageData`) became 1. The SQL count did not change, because
  Prisma already merged the three same-tick lookups into one
  `WHERE code IN ($1,$2,$3)` statement. The cache removes the dependence on
  that timing.
- The search count fan-out no longer exists: commit `af970e17` folded the
  counts into the primary query as correlated subselects, one statement per
  entity.

## Avatars (#522)

`GET /_next/image?url=<S3 avatar>&w=48&q=75` with `Accept: image/avif`
returns `image/avif`, 1,041 bytes. The original PNG is 113,680 bytes. A host
outside the configured patterns returns 400.

## Review feed (#516)

- Served HTML of `/` holds 10 review cards and the dehydrated `nextCursor`.
- A signed-out page load makes 0 `/api/trpc` requests after hydration. The
  loader fetched once after hydration before the change.
- A signed-in check needs a real session, which was not available for this
  run. `ReviewItemLoader.test.tsx` pins the signed-in path: one procedure, one
  input, no `refetch`, before and after the client session resolves.
