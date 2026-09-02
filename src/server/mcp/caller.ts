import "server-only";

import { db } from "@/server/db";
import { createCaller } from "@/server/api/root";
import type { SessionUser } from "@/server/auth/config";
import type { ToolContext } from "./types";

/**
 * Build a ToolContext whose tRPC caller runs every procedure as `user`.
 * This is the shim that lets MCP skills reuse ALL existing business rules
 * (auth walls, visibility, validation) with zero duplication.
 */
export function createCallerForUser(user: SessionUser): ToolContext {
  return {
    user,
    caller: createCaller(async () => ({
      db,
      session: { user, expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() },
      headers: new Headers(),
    })),
  };
}
