import type { LlmEnvLike } from "./providers";

let warned = false;
/** True when an LLM key is configured. Never throws — degraded mode, not boot death. */
// NOTE: the `as` cast is load-bearing — `ProcessEnv` is an index-signature
// type with no declared props, so it fails the weak-type check against the
// all-optional `LlmEnvLike` without it (tsc TS2559).
export function isLlmConfigured(
  e: LlmEnvLike = process.env as LlmEnvLike,
): boolean {
  const ok =
    (typeof e.OPENROUTER_API_KEY === "string" &&
      e.OPENROUTER_API_KEY.length > 0) ||
    (typeof e.LLM_API_KEY === "string" && e.LLM_API_KEY.length > 0);
  if (!ok && !warned) {
    warned = true;
    // intentional: loud once so a future maintainer removing the key is warned, not paged
    console.error(
      "[assistant] OPENROUTER_API_KEY (or LLM_API_KEY fallback) missing — chat/MCP-AI disabled, app continues",
    );
  }
  return ok;
}
