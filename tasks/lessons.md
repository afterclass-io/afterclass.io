# Lessons & Patterns

## Git & Staging Discipline

- **Scratch & Temporary Files**: Never commit `.scratch/` or other temporary exploration directories with feature or chore commits. Always keep `.scratch/` untracked or explicitly ignored.

## Next.js & TypeScript

- **Public Assets & Image Imports**: Never import static assets from `public/` using path-aliased module imports (e.g., `import cat from "@/../public/cat.webp"`). TypeScript bundler module resolution on Linux CI fails with `TS2307` because ambient wildcard declarations (`*.webp`) do not resolve through path aliases escaping `./src`. Always reference `/public` assets using root-relative string URLs (`<Image src="/cat.webp" ... />`).
- **Storybook & Client-Side Bundling with Runtime Env Validation**: When exporting schemas or utilities that evaluate `env.*` at module root level, always use optional chaining and safe fallbacks (`env.NEXT_PUBLIC_SUPPORTED_SCH_DOMAINS?.join(", ") ?? ""`). In Storybook and Chromatic builds where server environment variables are absent, ensure `DefinePlugin` passes `SKIP_ENV_VALIDATION="true"` to prevent client-side evaluation crashes.

## CI & Workflows

- **CI Postinstall Environment Setup**: Any CI workflow running `bun install` must copy `.env.example` to `.env` before installation if `postinstall` triggers `prisma generate` (which evaluates `prisma.config.ts` and requires `DIRECT_URL`).

## SEO, Metadata & Testing Discipline

- **JSON-LD Script Sanitization**: Never serialize unescaped user or database strings directly into `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />`. Always sanitize HTML-breaking characters (`<` to `\u003c`, `>` to `\u003e`, `&` to `\u0026`) and handle `undefined` inputs to avoid XSS and script tag injection.
- **Next.js Twitter Card Inheritance**: In Next.js App Router, if the root layout declares `twitter.title`, child routes omitting `twitter` will retain the root title rather than deriving it from `openGraph.title`. Always export explicit `twitter: { card: "summary_large_image", title, description }` in route metadata.
- **Tautological Test Prevention**: In E2E and integration tests for property omission (e.g. omitting `aggregateRating` when review count is zero), avoid guarding assertions inside conditional blocks (`if (course.aggregateRating === undefined)`), which silently succeed when the code is broken. Assert the entity exists and the field is `undefined` unconditionally.
- **Next.js Open Graph Locales**: Open Graph protocol expects standard locales (e.g. `en_GB` or `en_US`). Non-standard regional tags like `en_SG` are flagged by Facebook/social crawlers.
- **Mock Function Typing in Vitest / ESLint**: Mock factories wrapping untyped mocks trigger `@typescript-eslint/no-unsafe-return`. Wrap mock definitions with `/* eslint-disable @typescript-eslint/no-unsafe-return */` to avoid CI lint breaks.
- **Sitemap Loop Termination & Error Boundary**: Bound cursor loops with cycle detection (`seenCursors`) and hard page limits (`MAX_ROADMAP_PAGES`). Always catch database query rejections to prevent HTTP 500 on the entire sitemap.
- **Vercel System Env Fallbacks in `@t3-oss/env-nextjs`**: Vercel system variables (`VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`) are not prefixed with `NEXT_PUBLIC_`. Reference them explicitly in `runtimeEnv` fallbacks to avoid localhost fallbacks on preview builds.
