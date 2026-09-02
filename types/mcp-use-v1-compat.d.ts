// TODO Tasks 1-7: temporary compat so `tsc --noEmit` stays green after the
// mcp-use v1→v2 bump. v2 removed the `mcp-use/server` subpath and the
// `mcp-use/react` v1 exports (`useWidget`, `WidgetMetadata`). This shim
// re-exports the v2 surface under the old path and stubs the removed React
// members as `any` so Tasks 1-7 can delete it once they migrate each file.
// Delete this entire file when no `from "mcp-use/server"` or `useWidget` remains.
declare module "mcp-use/server" {
  // v2 removed this subpath — Tasks 1-3 replace every `mcp-use/server` import
  // with `mcp-use`. To keep tsc green until then, loosen the v2 types via
  // `any` bridges (skipLibCheck is true but src/mcp is still checked).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const MCPServer: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type MCPServer = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function text(text: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function object(value: unknown): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function array(value: unknown): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function widget(value: unknown): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function error(text: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function oauthSupabaseProvider(...args: any[]): any;
}
declare module "mcp-use/react" {
  export * from "mcp-use/dist/react/index.js";
  // v1 widget runtime — removed in v2 (replaced by useToolContext etc.)
  // Accept 0-1 args, 0-1 type params (Task 0 widgets use <TProps>, shared wrapper uses 5)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function useWidget<T = any>(...args: any[]): any;
  export type WidgetMetadata = {
    props?: unknown;
    state?: unknown;
    meta?: unknown;
    description?: string;
    title?: string;
  };
}
