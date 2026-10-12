import { describe, expect, it } from "vitest";
import localConfig from "./config.json";
import remoteItemsFixture from "./fixtures/remote-items.json";
import { EdgeConfigApiError, type RemoteItem } from "./remote";
import { planSeed, seedEdgeConfig } from "./seed";

type SeedOptions = Parameters<typeof seedEdgeConfig>[0];

function seedOptions(
  fetchImpl: typeof fetch,
  overrides: Partial<SeedOptions> & Pick<SeedOptions, "apply">,
): SeedOptions {
  return {
    local: localConfig,
    target: { token: "test-token", edgeConfigId: "ecfg_test" },
    fetchImpl,
    ...overrides,
  };
}

function itemsMissing(key: string) {
  return remoteItemsFixture.filter((item) => item.key !== key);
}

describe("planSeed", () => {
  it("given config.json and a store missing enableContentModeration, plan.create equals [{ operation: 'create', key: 'enableContentModeration', value: true }]", () => {
    const remote = itemsMissing("enableContentModeration");
    const plan = planSeed(localConfig, remote);
    expect(plan.create).toEqual([
      { operation: "create", key: "enableContentModeration", value: true },
    ]);
  });

  it("given a full store, plan.create is [] and plan.keepExisting has every local key", () => {
    const plan = planSeed(localConfig, remoteItemsFixture);
    expect(plan.create).toEqual([]);
    expect(plan.keepExisting).toEqual(Object.keys(localConfig));
  });

  it("given a store value that differs (enableReviewSort: false), plan.create is [] and plan.drifted equals ['enableReviewSort']", () => {
    const remote = remoteItemsFixture.map((item) =>
      item.key === "enableReviewSort" ? { ...item, value: false } : item,
    );
    const plan = planSeed(localConfig, remote);
    expect(plan.create).toEqual([]);
    expect(plan.drifted).toEqual(["enableReviewSort"]);
  });

  it("given a store key absent from config.json, plan.remoteOnly contains it and plan.create does not", () => {
    const extraItem: RemoteItem = { key: "storeOnlyKey", value: "extraVal" };
    const remote = [...remoteItemsFixture, extraItem];
    const plan = planSeed(localConfig, remote);
    expect(plan.remoteOnly).toContain("storeOnlyKey");
    expect(plan.create.some((op) => op.key === "storeOnlyKey")).toBe(false);
  });

  it("given a store chat that lacks maxToolRounds, plan.create is [] and plan.drifted equals ['chat']", () => {
    const chatItem = remoteItemsFixture.find((item) => item.key === "chat");
    if (!chatItem) throw new Error("Missing chat in fixture");
    const chatVal = chatItem.value as Record<string, unknown>;
    const chatWithoutMaxToolRounds = { ...chatVal };
    delete chatWithoutMaxToolRounds.maxToolRounds;
    const remote = remoteItemsFixture.map((item) =>
      item.key === "chat" ? { ...item, value: chatWithoutMaxToolRounds } : item,
    );
    const plan = planSeed(localConfig, remote);
    expect(plan.create).toEqual([]);
    expect(plan.drifted).toEqual(["chat"]);
  });

  it("plan.create keeps local key order", () => {
    const keptKeys = new Set(["enableCmdkTooltip", "enableReviewReactions"]);
    const remote = remoteItemsFixture.filter((item) => keptKeys.has(item.key));
    const plan = planSeed(localConfig, remote);
    const expectedOrder = Object.keys(localConfig).filter(
      (key) => !keptKeys.has(key),
    );
    expect(plan.create.map((op) => op.key)).toEqual(expectedOrder);
  });

  it("for every plan, plan.create.every((op) => op.operation === 'create')", () => {
    const plans = [
      planSeed(localConfig, []),
      planSeed(localConfig, remoteItemsFixture),
      planSeed(localConfig, itemsMissing("enableContentModeration")),
    ];
    for (const plan of plans) {
      expect(plan.create.every((op) => op.operation === "create")).toBe(true);
    }
  });
});

describe("seedEdgeConfig with a fake fetchImpl", () => {
  type CapturedCall = {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string | undefined;
  };

  function createFakeFetch(handlers: {
    getItems?: (callCount: number) => { status: number; body: unknown };
    patchItems?: (
      callCount: number,
      body: string | undefined,
    ) => { status: number; body: unknown };
  }) {
    const calls: CapturedCall[] = [];
    let getCallCount = 0;
    let patchCallCount = 0;

    const fake: typeof fetch = async (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const method = init?.method ?? "GET";
      const headersRecord: Record<string, string> = {};
      if (init?.headers) {
        if (init.headers instanceof Headers) {
          init.headers.forEach((val, key) => {
            headersRecord[key] = val;
          });
        } else if (Array.isArray(init.headers)) {
          for (const [key, val] of init.headers) {
            headersRecord[key] = val;
          }
        } else {
          Object.assign(headersRecord, init.headers);
        }
      }

      const body = typeof init?.body === "string" ? init.body : undefined;
      calls.push({ url, method, headers: headersRecord, body });

      if (method === "GET") {
        getCallCount += 1;
        const res = handlers.getItems
          ? handlers.getItems(getCallCount)
          : { status: 200, body: remoteItemsFixture };
        return new Response(JSON.stringify(res.body), {
          status: res.status,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (method === "PATCH") {
        patchCallCount += 1;
        const res = handlers.patchItems
          ? handlers.patchItems(patchCallCount, body)
          : { status: 200, body: { status: "ok" } };
        return new Response(JSON.stringify(res.body), {
          status: res.status,
          headers: { "Content-Type": "application/json" },
        });
      }

      throw new Error(`Unexpected HTTP method: ${method}`);
    };

    return {
      fake,
      calls,
      getCallCount: () => getCallCount,
      getPatchCallCount: () => patchCallCount,
    };
  }

  it("dry run: the fake receives exactly 1 call, a GET, and result mode is 'dry-run'", async () => {
    const missingItems = itemsMissing("enableContentModeration");
    const { fake, calls } = createFakeFetch({
      getItems: () => ({ status: 200, body: missingItems }),
    });

    const result = await seedEdgeConfig(seedOptions(fake, { apply: false }));

    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("GET");
    expect(result.mode).toBe("dry-run");
  });

  it("up to date with apply: true: exactly 1 call, a GET, and result mode is 'up-to-date'", async () => {
    const { fake, calls } = createFakeFetch({});

    const result = await seedEdgeConfig(seedOptions(fake, { apply: true }));

    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("GET");
    expect(result.mode).toBe("up-to-date");
  });

  it("apply with one missing key: exactly 3 calls in order GET, PATCH, GET, and result mode is 'applied'", async () => {
    const missingItems = itemsMissing("enableContentModeration");
    const { fake, calls } = createFakeFetch({
      getItems: (count) => ({
        status: 200,
        body: count === 1 ? missingItems : remoteItemsFixture,
      }),
    });

    const result = await seedEdgeConfig(seedOptions(fake, { apply: true }));

    expect(calls).toHaveLength(3);
    expect(calls.map((c) => c.method)).toEqual(["GET", "PATCH", "GET"]);
    expect(result.mode).toBe("applied");
  });

  it("the PATCH URL equals https://api.vercel.com/v1/global-config/ecfg_test/items. The method is PATCH. The Authorization header equals Bearer test-token. The body parses to { items: [{ operation: 'create', key, value }] }", async () => {
    const missingItems = itemsMissing("enableContentModeration");
    const { fake, calls } = createFakeFetch({
      getItems: (count) => ({
        status: 200,
        body: count === 1 ? missingItems : remoteItemsFixture,
      }),
    });

    await seedEdgeConfig(seedOptions(fake, { apply: true }));

    const patchCall = calls[1];
    expect(patchCall).toBeDefined();
    expect(patchCall?.url).toBe(
      "https://api.vercel.com/v1/global-config/ecfg_test/items",
    );
    expect(patchCall?.method).toBe("PATCH");
    expect(patchCall?.headers.Authorization).toBe("Bearer test-token");

    const parsedBody = JSON.parse(patchCall?.body ?? "{}") as {
      items: unknown[];
    };
    expect(parsedBody).toEqual({
      items: [
        {
          operation: "create",
          key: "enableContentModeration",
          value: true,
        },
      ],
    });
  });

  it("the PATCH body string contains none of 'update', 'upsert', 'delete'", async () => {
    const missingItems = itemsMissing("enableContentModeration");
    const { fake, calls } = createFakeFetch({
      getItems: (count) => ({
        status: 200,
        body: count === 1 ? missingItems : remoteItemsFixture,
      }),
    });

    await seedEdgeConfig(seedOptions(fake, { apply: true }));

    const patchBody = calls[1]?.body ?? "";
    expect(patchBody).not.toContain("update");
    expect(patchBody).not.toContain("upsert");
    expect(patchBody).not.toContain("delete");
  });

  it("with teamId: 'team_1', both the GET and PATCH URLs end with ?teamId=team_1", async () => {
    const missingItems = itemsMissing("enableContentModeration");
    const { fake, calls } = createFakeFetch({
      getItems: (count) => ({
        status: 200,
        body: count === 1 ? missingItems : remoteItemsFixture,
      }),
    });

    await seedEdgeConfig(
      seedOptions(fake, {
        target: {
          token: "test-token",
          edgeConfigId: "ecfg_test",
          teamId: "team_1",
        },
        apply: true,
      }),
    );

    expect(calls).toHaveLength(3);
    for (const call of calls) {
      expect(call.url).toMatch(/\?teamId=team_1$/);
    }
  });

  it("PATCH returns 409: the promise rejects with EdgeConfigApiError and status === 409. The fake saw no further PATCH", async () => {
    const missingItems = itemsMissing("enableContentModeration");
    const { fake, getPatchCallCount } = createFakeFetch({
      getItems: () => ({ status: 200, body: missingItems }),
      patchItems: () => ({ status: 409, body: { error: "Conflict" } }),
    });

    let thrownError: unknown;
    try {
      await seedEdgeConfig(seedOptions(fake, { apply: true }));
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(EdgeConfigApiError);
    expect((thrownError as EdgeConfigApiError).status).toBe(409);
    expect(getPatchCallCount()).toBe(1);
  });

  it("GET returns 401: the promise rejects. The fake saw zero PATCH calls", async () => {
    const { fake, getPatchCallCount } = createFakeFetch({
      getItems: () => ({ status: 401, body: { error: "Unauthorized" } }),
    });

    await expect(
      seedEdgeConfig(seedOptions(fake, { apply: true })),
    ).rejects.toThrow();

    expect(getPatchCallCount()).toBe(0);
  });

  it("GET returns a non-array body: the promise rejects. Zero PATCH calls", async () => {
    const { fake, getPatchCallCount } = createFakeFetch({
      getItems: () => ({ status: 200, body: { invalid: "not an array" } }),
    });

    await expect(
      seedEdgeConfig(seedOptions(fake, { apply: true })),
    ).rejects.toThrow();

    expect(getPatchCallCount()).toBe(0);
  });

  it("a local key 'bad key': the promise rejects before the fake is called (0 calls)", async () => {
    const { fake, calls } = createFakeFetch({});
    const badLocal = { ...localConfig, "bad key": true };

    await expect(
      seedEdgeConfig(seedOptions(fake, { local: badLocal, apply: true })),
    ).rejects.toThrow();

    expect(calls).toHaveLength(0);
  });

  it("the post-write GET lacks a created key: the promise rejects", async () => {
    const missingItems = itemsMissing("enableContentModeration");
    const { fake } = createFakeFetch({
      // 1st GET missing, 2nd GET still missing
      getItems: () => ({ status: 200, body: missingItems }),
    });

    await expect(
      seedEdgeConfig(seedOptions(fake, { apply: true })),
    ).rejects.toThrow(/Post-write verification failed/);
  });

  it("no rejection message contains test-token", async () => {
    const errorScenarios = [
      () =>
        createFakeFetch({
          getItems: () => ({ status: 401, body: { error: "Unauthorized" } }),
        }),
      () =>
        createFakeFetch({
          getItems: () => ({ status: 403, body: { error: "Forbidden" } }),
        }),
      () =>
        createFakeFetch({
          getItems: () => ({
            status: 200,
            body: itemsMissing("enableContentModeration"),
          }),
          patchItems: () => ({ status: 409, body: { error: "Conflict" } }),
        }),
    ];

    for (const makeFake of errorScenarios) {
      const { fake } = makeFake();
      try {
        await seedEdgeConfig(seedOptions(fake, { apply: true }));
        expect.unreachable("Should have rejected");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        expect(message).not.toContain("test-token");
      }
    }
  });
});
