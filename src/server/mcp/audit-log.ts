import { stripSecretsFromValue } from "@/mcp/output-policy";

/**
 * Append-only write audit trail (Task 7).
 *
 * `appendAuditLog({ userId, tool, args, result })` records every successful
 * write-tool execution through the shared dispatch pipeline (both
 * transports). Transport for this task: a single-line `[audit:write]` JSON
 * record on stdout, picked up by the server log pipeline. Task 11 persists
 * these records to the DB; the signature here is already the one Task 11
 * consumes, so the dispatch call site does not change.
 *
 * Secret hygiene: args pass through the canonical `stripSecretsFromValue`
 * (Task 4 helper, R8) so bearer tokens and private notes never land in the
 * log. Never throws — an audit failure must never break the tool call it
 * records.
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
