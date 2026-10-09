# Edge Config

This directory contains files used for Vercel's Edge Config store.

Why use Vercel Edge Config?

- No need for new prod deployment when making changes to configs.
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
