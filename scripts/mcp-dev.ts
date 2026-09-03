import { spawn } from "child_process";
import { dirname } from "path";
import { fileURLToPath } from "url";

// `bun run mcp:dev` — local Inspector with zero-auth dev bypass.
//
// Sets NODE_ENV=development + MCP_DEV_BYPASS=true (unless already set in the
// environment) so every tool resolves as the seeded dev user
// (MCP_DEV_USER_EMAIL, default test_hash_pwd@smu.edu.sg) without Supabase.
// Explicit env wins: MCP_DEV_BYPASS=false tests the fail-closed path,
// MCP_DEV_USER_EMAIL=... tests a different dev user. Never active in
// production — `mcp-use start` forces NODE_ENV=production, which disables
// the bypass in src/mcp/user.ts.
const env: Record<string, string | undefined> = { ...process.env };
if (!env.NODE_ENV) env.NODE_ENV = "development";
if (!env.MCP_DEV_BYPASS) env.MCP_DEV_BYPASS = "true";

// Resolve the repo root from this script's location so the server boots even
// when invoked by absolute path from a different cwd. NOTE: --mcp-dir and
// --views-dir must stay project-relative (the CLI rejects absolute paths),
// so we pass relative values and set cwd: repoRoot instead.
//
// --views-dir views is REQUIRED: the CLI's dev middleware only serves View
// sources whose URL starts with /views/. With the default viewsDir derived
// from --mcp-dir (src/mcp/views), the virtual module imports
// /src/mcp/views/<name>/view.tsx, which 404s and the Inspector panel sticks
// on "Compiling...". Views live at the repo root (v2 scaffold layout).
//
// Bind 127.0.0.1 (the CLI default): the Inspector page server-renders
// window.__MCP_SANDBOX_ORIGIN__ as http://127.0.0.1:<port> and the Component
// iframe loads from that origin. Open the Inspector at http://localhost:3001/
// mcp/inspector — page + sandbox then agree on the same loopback.
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const child = spawn(
  "bunx",
  ["mcp-use", "dev", "--mcp-dir", "src/mcp", "--views-dir", "views", "--port", "3001", "--host", "127.0.0.1"],
  { stdio: "inherit", shell: process.platform === "win32", env: env as NodeJS.ProcessEnv, cwd: repoRoot },
);
child.on("exit", (code) => process.exit(code ?? 0));
child.on("error", (err) => {
  console.error(err);
  process.exit(1);
});
