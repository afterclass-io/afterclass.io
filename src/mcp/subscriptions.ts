/**
 * Opt the embedded /api/mcp route out of `subscriptions/listen` (protocol
 * revision 2026-07-28), the way the Python SDK's `subscriptions=False` does
 * (modelcontextprotocol/python-sdk#3626):
 *
 * - `server/discover` reports `listChanged: false` (and `subscribe: false`),
 *   so the TypeScript client's `listChanged` option skips auto-opening a
 *   listen stream.
 * - A `subscriptions/listen` that still arrives is answered at once with
 *   JSON-RPC -32601 over HTTP 404 instead of opening a stream.
 *
 * Why: mcp-use hard-codes `listChanged: true`, and the SDK serves listen as
 * an SSE stream with 15s keep-alives that only ends when the client leaves.
 * On Vercel each stream held a function until the 300s maxDuration kill
 * (40-64% of /api/mcp invocations), and the client then reconnected. The
 * in-process event bus cannot reach other instances, and the catalog is
 * static, so no change notification was ever delivered on those streams.
 * See modelcontextprotocol/typescript-sdk#2873.
 */

const LISTEN_METHOD = "subscriptions/listen";
const DISCOVER_METHOD = "server/discover";
const METHOD_NOT_FOUND = -32601;

type JsonRpcRequest = { id?: unknown; method?: unknown };

/** Reads the JSON-RPC method: the `Mcp-Method` header first, else the body. */
async function readRequest(request: Request): Promise<JsonRpcRequest | null> {
  const headerMethod = request.headers.get("mcp-method");
  try {
    const body = (await request.clone().json()) as unknown;
    if (body && typeof body === "object" && !Array.isArray(body)) {
      const message = body as JsonRpcRequest;
      return { id: message.id, method: headerMethod ?? message.method };
    }
  } catch {
    // Not a JSON body: fall through to the header alone.
  }
  return headerMethod ? { id: null, method: headerMethod } : null;
}

type Capabilities = {
  tools?: { listChanged?: boolean };
  prompts?: { listChanged?: boolean };
  resources?: { listChanged?: boolean; subscribe?: boolean };
};

/** Flips the change-notification flags off in one JSON-RPC message. */
function withoutChangeNotifications(message: unknown): unknown {
  const capabilities = (
    message as { result?: { capabilities?: Capabilities } } | null
  )?.result?.capabilities;
  if (!capabilities) return message;
  if (capabilities.tools) capabilities.tools.listChanged = false;
  if (capabilities.prompts) capabilities.prompts.listChanged = false;
  if (capabilities.resources) {
    capabilities.resources.listChanged = false;
    capabilities.resources.subscribe = false;
  }
  return message;
}

/** Rewrites a discover response, as plain JSON or as SSE `data:` frames. */
async function rewriteDiscover(response: Response): Promise<Response> {
  const text = await response.text();
  const isSse = (response.headers.get("content-type") ?? "").includes(
    "text/event-stream",
  );
  const rewrite = (raw: string) =>
    JSON.stringify(withoutChangeNotifications(JSON.parse(raw)));

  let body = text;
  try {
    body = isSse
      ? text
          .split("\n")
          .map((line) =>
            line.startsWith("data:")
              ? `data: ${rewrite(line.slice("data:".length).trim())}`
              : line,
          )
          .join("\n")
      : rewrite(text);
  } catch {
    // Unparseable (e.g. an error page): pass the original body through.
  }

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** Wraps the route's POST handler with the subscriptions opt-out. */
export function declineSubscriptions<Rest extends unknown[]>(
  post: (request: Request, ...rest: Rest) => Promise<Response>,
) {
  return async (request: Request, ...rest: Rest): Promise<Response> => {
    const message = await readRequest(request);

    if (message?.method === LISTEN_METHOD) {
      return Response.json(
        {
          jsonrpc: "2.0",
          id: message.id ?? null,
          error: {
            code: METHOD_NOT_FOUND,
            message: `Method not found: ${LISTEN_METHOD}`,
          },
        },
        { status: 404 },
      );
    }

    const response = await post(request, ...rest);
    return message?.method === DISCOVER_METHOD && response.ok
      ? rewriteDiscover(response)
      : response;
  };
}
