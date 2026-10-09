export class BodyTooLargeError extends Error {
  constructor(readonly maxBytes: number) {
    super(`Request body exceeds ${maxBytes} bytes`);
    this.name = "BodyTooLargeError";
  }
}

/**
 * Read a request body as text and refuse it once it passes `maxBytes`.
 *
 * The `content-length` header is only a hint: a chunked upload has none, and
 * a client can understate it. So the cap counts the bytes that actually
 * arrive and cancels the stream as soon as the limit is crossed.
 */
export async function readTextCapped(
  req: Request,
  maxBytes: number,
): Promise<string> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes)
    throw new BodyTooLargeError(maxBytes);
  if (!req.body) return "";

  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new BodyTooLargeError(maxBytes);
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}
