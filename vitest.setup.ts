// Test setup file (referenced by tooling that supports setupFiles).
//
// NOTE: the supabase-js WebSocket polyfill that lived here was removed:
// engines + .nvmrc pin Node >= 22, which ships a native global WebSocket, and
// the jsdom environment provides one too. The polyfill imported the transitive
// `ws` package, which ships no types and has no @types/ws in the graph, so it
// broke `tsc --noEmit` (TS7016). Verified 2026-09-09: supabase-js
// import + realtime subscribe get past the "native WebSocket not found" guard
// on Node 24 with no polyfill; the guard only fires on Node <= 20, which the
// engines floor excludes.
export {};
