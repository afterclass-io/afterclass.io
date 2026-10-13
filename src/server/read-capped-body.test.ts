import { describe, expect, it } from "vitest";

import { BodyTooLargeError, readTextCapped } from "./read-capped-body";

function post(body: BodyInit | null, headers: Record<string, string> = {}) {
  return new Request("http://localhost/x", { method: "POST", body, headers });
}

describe("readTextCapped", () => {
  it("returns the text of a body under the cap", async () => {
    await expect(readTextCapped(post('{"a":1}'), 100)).resolves.toBe('{"a":1}');
  });

  it("returns an empty string when there is no body", async () => {
    await expect(readTextCapped(post(null), 100)).resolves.toBe("");
  });

  it("decodes multi-byte characters split across chunks", async () => {
    const bytes = new TextEncoder().encode("héllo €");
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const b of bytes) controller.enqueue(Uint8Array.of(b));
        controller.close();
      },
    });
    const req = new Request("http://localhost/x", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit);
    await expect(readTextCapped(req, 100)).resolves.toBe("héllo €");
  });

  it("refuses a body over the cap when no content-length is sent", async () => {
    await expect(readTextCapped(post("x".repeat(101)), 100)).rejects.toThrow(
      BodyTooLargeError,
    );
  });

  it("refuses on a declared length over the cap without reading", async () => {
    await expect(
      readTextCapped(post("x", { "content-length": "101" }), 100),
    ).rejects.toThrow(BodyTooLargeError);
  });

  it("ignores a non-numeric content-length and counts real bytes", async () => {
    await expect(
      readTextCapped(post("x".repeat(101), { "content-length": "abc" }), 100),
    ).rejects.toThrow(BodyTooLargeError);
  });

  it("counts real bytes when the declared length is understated", async () => {
    await expect(
      readTextCapped(post("x".repeat(101), { "content-length": "1" }), 100),
    ).rejects.toThrow(BodyTooLargeError);
  });

  it("accepts a body exactly at the cap", async () => {
    await expect(
      readTextCapped(post("x".repeat(100)), 100),
    ).resolves.toHaveLength(100);
  });
});
