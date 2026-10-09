import { z } from "zod";

const GLOBAL_CONFIG_API = "https://api.vercel.com/v1/global-config";

/** Key rule from the Vercel docs: alphanumeric, "_" and "-", up to 256 chars. */
export const EDGE_CONFIG_KEY_PATTERN = /^[A-Za-z0-9_-]{1,256}$/;

const remoteItemSchema = z.object({
  key: z.string(),
  value: z.unknown(),
});
export type RemoteItem = z.infer<typeof remoteItemSchema>;

export type RemoteTarget = {
  token: string; // Vercel access token. Never logged.
  edgeConfigId: string; // must match /^ecfg_/
  teamId?: string; // sent as ?teamId=
};

/** Only the "create" operation exists in this client. */
export type CreateOperation = {
  operation: "create";
  key: string;
  value: unknown;
};

export class EdgeConfigApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "EdgeConfigApiError";
  }
}

function buildItemsUrl(target: RemoteTarget): string {
  const url = new URL(`${GLOBAL_CONFIG_API}/${target.edgeConfigId}/items`);
  if (target.teamId) {
    url.searchParams.set("teamId", target.teamId);
  }
  return url.toString();
}

export async function fetchRemoteItems(
  target: RemoteTarget,
  fetchImpl?: typeof fetch,
): Promise<RemoteItem[]> {
  const customFetch = fetchImpl ?? fetch;
  const url = buildItemsUrl(target);
  const response = await customFetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${target.token}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new EdgeConfigApiError(
      response.status,
      `Edge Config API error (${response.status}): ${errorBody}`,
    );
  }

  const json: unknown = await response.json();
  return z.array(remoteItemSchema).parse(json);
}

export async function createRemoteItems(
  target: RemoteTarget,
  items: readonly CreateOperation[],
  fetchImpl?: typeof fetch,
): Promise<void> {
  const customFetch = fetchImpl ?? fetch;
  const url = buildItemsUrl(target);
  const response = await customFetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${target.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new EdgeConfigApiError(
      response.status,
      `Edge Config API error (${response.status}): ${errorBody}`,
    );
  }
}
