// Test stand-in for the `server-only` package. The real module throws unless
// it is bundled for a React Server Component, so a Node test run that imports
// a server module would fail on it. Mapped in `vitest.config.ts`.
export {};
