import { WebSocket } from "ws";

// supabase-js 2.112 requires a global WebSocket on Node 20 (Node 22+ ships one
// natively). Without this the import of src/server/supabase.ts throws at
// collection time ("Node.js detected but native WebSocket not found") and breaks
// the pre-existing main test suite. Polyfill from the transitive `ws` dep.
if (typeof (globalThis as unknown as Record<string, unknown>).WebSocket === "undefined") {
  (globalThis as unknown as Record<string, unknown>).WebSocket = WebSocket;
}
