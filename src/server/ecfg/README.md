# Edge Config

This directory contains files used for Vercel's Edge Config store.

Why use Vercel Edge Config?

- Config changes need no code change or deployment. A change reaches the app within a minute, or at once after a flush (see Caching and flush).
- Easier rollback of features.
- Faster load times: Edge Config takes single-digit ms to load.
- Simple JSON fallback when Edge Config is unreachable.

## Seeding Model

Edge Config updates follow a **seed-only** model:

- The seeding script (`bun run ecfg:seed`) only creates top-level keys that are missing in the remote Edge Config store.
- **Existing store values are never overwritten**: live store values take precedence over `config.json`. To modify live values, edit them directly in the Vercel dashboard.
- Store-only keys are never deleted by the script.

## Read Path

`getEdgeConfig()` (`src/server/ecfg/edge-config.ts`) reads the store and validates each top-level key on its own:

- A valid store key wins.
- A missing or invalid key takes its `config.json` value. The app logs one warning that names the key.
- A fetch error returns `config.json` for all keys.

## Caching and flush

`getEdgeConfig()` caches the raw store read for 60 seconds (`EDGE_CONFIG_REVALIDATE_SECONDS` in `edge-config.ts`). The cache saves Edge Config read billing: about one read per minute per region instead of one per render.

- A console change applies when the one minute window ends, or at once after a flush.
- This covers every key: the kill switches (`chatEnabled`, `widgetEnabled`, `mcpEnabled`), the tunables and the flags. Flush when a change cannot wait a minute.
- To flush, call the operator route. It drops the cached read, so the next request reads the live store:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/revalidate/edge-config
```

- The route is `POST /api/revalidate/edge-config`. It uses the same bearer secret as the cron routes. A missing secret returns 500 and a wrong secret returns 401.
- A failed store read is never cached, so an outage does not pin the fallback on a live server.
- A build that cannot reach Edge Config bakes the `config.json` fallback into the static pages. Those pages keep the fallback values until their own revalidation window ends or until a flush.

## `publicData` visibility

`publicData` decides what signed-out visitors see. Signed-in users always see every domain. Each flag is private unless the store sets it to `true`.

The flags form a hierarchy, resolved once in `src/server/ecfg/public-data.ts` (`PUBLIC_DATA_PARENTS`). A child is public only when its own flag and every parent are on:

| Domain           | Also needs              | Why                                                |
| ---------------- | ----------------------- | -------------------------------------------------- |
| `courses`        | -                       |                                                    |
| `professors`     | -                       |                                                    |
| `classData`      | `courses`, `professors` | A class is a course section taught by a professor. |
| `reviews`        | `courses`               | Every review names its course.                     |
| `publicRoadmaps` | `courses`               | A roadmap is a list of courses.                    |

A review can also name a professor. While `professors` is off, signed-out visitors get course-only reviews: professor reviews are left out of feeds, rating figures and direct links.

Pages and procedures name only the domain of the data they show, for example `canViewData(session, "reviews")`. They never list parents themselves.

While `reviews` is off, signed-out visitors see placeholder cards under a "Login to see review" overlay. No review data is sent.

### Adding New Configs

1. Update the Zod schema in `src/server/ecfg/config.ts`.
2. Add default values in `src/server/ecfg/config.json`.
3. Validate the JSON against the schema: `bun run ecfg:test`.
4. Import the schema and use it as required.
5. Commit and push the changes. The CI workflow seeds any missing keys on merge to `main`.

### Seeding Manually

Dry run (default, nothing written):

PowerShell:

```powershell
$env:VERCEL_TOKEN = "<token>"
$env:VERCEL_EDGE_CONFIG_ID = "ecfg_<id>"
bun run ecfg:seed
```

Bash:

```bash
export VERCEL_TOKEN="<token>"
export VERCEL_EDGE_CONFIG_ID="ecfg_<id>"
bun run ecfg:seed
```

Apply missing keys:

PowerShell:

```powershell
bun run ecfg:seed -- --apply
```

Bash:

```bash
bun run ecfg:seed -- --apply
```
