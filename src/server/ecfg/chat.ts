import { getEdgeConfig } from "@/common/providers/EdgeConfig/EdgeConfigProvider";
import { DEFAULT_CHAT_CONFIG, type ChatConfig } from "./config";

/**
 * Server-side chat config: live Edge Config with local JSON fallback.
 *
 * getEdgeConfig() never throws - it uses safeParse and catches fetch errors,
 * falling back to the local config.json. So if the remote Edge Config is
 * unavailable in dev (e.g. "Unauthorized"), we still get a valid config
 * object from the local JSON, and `cfg?.chat` will be present.
 * If for any reason `chat` is missing, we fall back to DEFAULT_CHAT_CONFIG.
 *
 * Environment overrides: CHAT_* env vars win over config.json defaults so
 * limits can be changed on redeploy without a code change.
 */
export async function getChatConfig(): Promise<ChatConfig> {
  const cfg = await getEdgeConfig();
  const base: ChatConfig = cfg?.chat ?? DEFAULT_CHAT_CONFIG;
  let out: ChatConfig = { ...base };
  const envRate = process.env.CHAT_RATE_LIMIT_PER_MINUTE;
  if (envRate !== undefined && envRate !== "") {
    const n = Number(envRate);
    if (Number.isFinite(n)) out = { ...out, rateLimitPerMinute: n };
  }
  const envMcpRate = process.env.CHAT_MCP_RATE_LIMIT_PER_MINUTE;
  if (envMcpRate !== undefined && envMcpRate !== "") {
    const n = Number(envMcpRate);
    if (Number.isFinite(n)) out = { ...out, mcpRateLimitPerMinute: n };
  }
  return out;
}

/** Effective per-minute limit for chat write-tool executions (chat-write: budget). */
export function getChatWriteRateLimit(chat: ChatConfig): number {
  const v = process.env.CHAT_WRITE_RATE_LIMIT_PER_MINUTE;
  if (v !== undefined && v !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return chat.rateLimitPerMinute;
}

/** Effective fixed-window size in minutes for rate limiting. */
export function getRateLimitWindowMinutes(): number {
  const v = process.env.CHAT_RATE_LIMIT_WINDOW_MINUTES;
  if (v !== undefined && v !== "") {
    const n = Number(v);
    if (Number.isFinite(n) && n >= 1 && n <= 60) return n;
  }
  return 1;
}
