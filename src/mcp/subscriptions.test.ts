import { describe, expect, it, vi } from "vitest";

import { declineSubscriptions } from "./subscriptions";

const rpc = (method: string, id: unknown = 1, headers?: HeadersInit) =>
  new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params: {} }),
  });

const capabilities = {
  logging: {},
  tools: { listChanged: true },
  prompts: { listChanged: true },
  resources: { listChanged: true, subscribe: true },
};

const discoverResult = (id: unknown) => ({
  jsonrpc: "2.0",
  id,
  result: { supportedVersions: ["2026-07-28"], capabilities },
});

const offCapabilities = {
  logging: {},
  tools: { listChanged: false },
  prompts: { listChanged: false },
  resources: { listChanged: false, subscribe: false },
};

describe("declineSubscriptions", () => {
  it("answers subscriptions/listen with -32601 over 404 without opening a stream", async () => {
    const post = vi.fn();
    const res = await declineSubscriptions(post)(
      rpc("subscriptions/listen", "listen:0"),
    );
    expect(post).not.toHaveBeenCalled();
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({
      jsonrpc: "2.0",
      id: "listen:0",
      error: {
        code: -32601,
        message: "Method not found: subscriptions/listen",
      },
    });
  });

  it("recognises listen from the Mcp-Method header", async () => {
    const post = vi.fn();
    const res = await declineSubscriptions(post)(
      new Request("http://localhost/api/mcp", {
        method: "POST",
        headers: { "mcp-method": "subscriptions/listen" },
        body: "not json",
      }),
    );
    expect(post).not.toHaveBeenCalled();
    expect(res.status).toBe(404);
  });

  it("turns the change-notification flags off in a JSON discover result", async () => {
    const post = vi.fn(async () => Response.json(discoverResult(7)));
    const res = await declineSubscriptions(post)(rpc("server/discover", 7));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      result: { capabilities: unknown; supportedVersions: string[] };
    };
    expect(body.result.capabilities).toEqual(offCapabilities);
    expect(body.result.supportedVersions).toEqual(["2026-07-28"]);
  });

  it("turns the flags off in an SSE discover result", async () => {
    const post = vi.fn(
      async () =>
        new Response(
          `event: message\ndata: ${JSON.stringify(discoverResult(8))}\n\n`,
          { headers: { "content-type": "text/event-stream" } },
        ),
    );
    const res = await declineSubscriptions(post)(rpc("server/discover", 8));
    const text = await res.text();
    expect(text.startsWith("event: message\ndata: ")).toBe(true);
    const frame = text.split("\n").find((line) => line.startsWith("data:"));
    const body = JSON.parse(frame!.slice("data:".length)) as {
      result: { capabilities: unknown };
    };
    expect(body.result.capabilities).toEqual(offCapabilities);
  });

  it("passes every other method through untouched, with its arguments", async () => {
    const response = new Response("ok");
    const post = vi.fn(async (_request: Request, _context: { n: number }) =>
      Promise.resolve(response),
    );
    const request = rpc("tools/call");
    const context = { n: 1 };
    const res = await declineSubscriptions(post)(request, context);
    expect(res).toBe(response);
    expect(post).toHaveBeenCalledWith(request, context);
    // The wrapper reads a clone, so the handler can still read the body.
    expect(await request.json()).toMatchObject({ method: "tools/call" });
  });

  it("leaves a failed discover response as it is", async () => {
    const response = new Response("nope", { status: 401 });
    const post = vi.fn(async () => response);
    const res = await declineSubscriptions(post)(rpc("server/discover"));
    expect(res).toBe(response);
  });
});
