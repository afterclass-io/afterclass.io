# Edge Config

This directory contains files used for Vercel's Edge Config store.

Why use Vercel Edge Config?

- Config changes need no code change or deployment. A change reaches the app after a flush or after the 24 hour cache window (see Caching and flush).
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

`getEdgeConfig()` caches the raw store read for 24 hours (`EDGE_CONFIG_REVALIDATE_SECONDS` in `edge-config.ts`). The cache saves Edge Config read billing.

- A console change does not apply at once. It applies when the 24 hour window ends or after a flush.
- This covers every key: the kill switches (`chatEnabled`, `widgetEnabled`, `mcpEnabled`), the tunables and the flags. Flush after each console change.
- To flush, call the operator route. It drops the cached read, so the next request reads the live store:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/revalidate/edge-config
```

- The route is `POST /api/revalidate/edge-config`. It uses the same bearer secret as the cron routes. A missing secret returns 500 and a wrong secret returns 401.
- A failed store read is never cached, so an outage does not pin the fallback for 24 hours on a live server.
- A build that cannot reach Edge Config bakes the `config.json` fallback into the static pages. Those pages keep the fallback values until their own revalidation window ends or until a flush.

## Usage

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
