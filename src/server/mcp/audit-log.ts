import { stripSecretsFromValue } from "@/mcp/output-policy";

/**
 * Append-only write audit trail.
 *
 * `appendAuditLog({ userId, tool, args, result })` records every successful
 * write-tool execution through the shared dispatch pipeline (both
 * transports) as a single-line `[audit:write]` JSON record on stdout,
 * picked up by the server log pipeline.
 *
 * Secret hygiene: args pass through the canonical `stripSecretsFromValue`
 * so bearer tokens and private notes never land in the log. Never throws —
 * an audit failure must never break the tool call it records.
 */
export interface AuditLogEntry {
  userId: string;
  tool: string;
  args: unknown;
  result: string;
}

function scrubForAudit(value: unknown): unknown {
  try {
    const parsed: unknown = JSON.parse(JSON.stringify(value));
    if (parsed === undefined) return value;
    return stripSecretsFromValue(parsed);
  } catch {
    return "[unserializable]";
  }
}

export function appendAuditLog(entry: AuditLogEntry): void {
  try {
    const record = {
      event: "audit:write",
      at: new Date().toISOString(),
      userId: entry.userId,
      tool: entry.tool,
      args: scrubForAudit(entry.args),
      result: entry.result,
    };
    let line: string;
    try {
      line = JSON.stringify(record) ?? "[unserializable]";
    } catch {
      line = "[unserializable]";
    }
    // intentional: the write-audit record itself — single line for log ingestion
    console.log(`[audit:write] ${line}`);
  } catch {
    // Never break the tool call for an audit failure.
  }
}
