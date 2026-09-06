import { describe, expect, it } from "vitest";
import { DefaultChatTransport, type UIMessage } from "ai";

// Pins the transport `body` wiring used by chat-panel.tsx: a Resolvable
// function returning the latest page-context snapshot per send. Verified
// against installed ai@^7 `HttpChatTransport.sendMessages`, which awaits
// resolve(this.body) per request and merges per-call options.body over it —
// so a function body gives send-time freshness and covers every send path
// (composer, suggestions, retry) with no composer.tsx change.

function makePanelTransport(getSnapshot: () => unknown) {
  return new DefaultChatTransport({
    api: "/api/chat",
    body: () => {
      const ctx = getSnapshot();
      return ctx ? { pageContext: ctx } : {};
    },
  });
}

async function resolveTransportBody(
  transport: DefaultChatTransport<UIMessage>,
) {
  const body = (
    transport as unknown as { body: () => Promise<object> | object }
  ).body;
  return await body();
}

describe("chat-panel page-context transport body", () => {
  it("includes the page-context snapshot in the chat request body", async () => {
    const transport = makePanelTransport(() => ({
      pathname: "/bidding/analytics",
      course: "IS215",
      section: "G1",
    }));
    await expect(resolveTransportBody(transport)).resolves.toEqual({
      pageContext: {
        pathname: "/bidding/analytics",
        course: "IS215",
        section: "G1",
      },
    });
  });

  it("omits pageContext when the snapshot is null (e.g. /assistant)", async () => {
    const transport = makePanelTransport(() => null);
    await expect(resolveTransportBody(transport)).resolves.toEqual({});
  });

  it("picks up navigation between sends (send-time, not mount-time)", async () => {
    let snapshot: unknown = { pathname: "/courses" };
    const transport = makePanelTransport(() => snapshot);
    await expect(resolveTransportBody(transport)).resolves.toEqual({
      pageContext: { pathname: "/courses" },
    });
    // User navigates; the ref mirror updates on re-render, next send is fresh.
    snapshot = { pathname: "/bidding/analytics", course: "IS215" };
    await expect(resolveTransportBody(transport)).resolves.toEqual({
      pageContext: { pathname: "/bidding/analytics", course: "IS215" },
    });
  });
});
