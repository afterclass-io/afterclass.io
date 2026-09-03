# Edge Config

This directory contains files used for Vercel's Edge Config store.

why use Vercel Edge Config?

- no need for new prod deployment when making changes to configs
  - to change a config, we would need to push to the `main` branch, which would still trigger a rebuild & prod:staged deployment due to automation, but live prod wont need to be changed
- easier rollback of features
- faster load times - latencies can very quickly add up, edgeconfig takes single digit ms to load
- simple json, can be moved anywhere, no need to rely on ecfg if not needed

## Usage

### Adding New Configs

1. update zod schema in `src/server/ecfg/config.ts`
2. update the config json in `src/server/ecfg/config.json` to match the desired values on EdgeConfig
3. to validate the json against the zod schema, run `bun run ecfg:test`
4. import the zod schema and use it as required
5. commit & push the changes

### Cache Invalidation

The app caches the fetched edge config for 24h (`unstable_cache`, tag `edge-config`). After pushing a
change to the remote config, invalidate the cache without deploying:

```sh
curl -X POST https://<site>/api/revalidate \
  -H "x-revalidate-secret: $REVALIDATE_SECRET"
```

`REVALIDATE_SECRET` is a Vercel environment variable; requests without a matching
`x-revalidate-secret` header are rejected with 401.
