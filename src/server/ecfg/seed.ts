import { isDeepStrictEqual } from "node:util";
import {
  type CreateOperation,
  EDGE_CONFIG_KEY_PATTERN,
  type RemoteItem,
  type RemoteTarget,
  createRemoteItems,
  fetchRemoteItems,
} from "./remote";

export type SeedPlan = {
  create: CreateOperation[]; // local top-level keys missing from the store
  keepExisting: string[]; // keys present in both. Never written.
  drifted: string[]; // subset of keepExisting whose value differs. Report only.
  remoteOnly: string[]; // keys only in the store. Never deleted.
};

export type SeedResult = SeedPlan & {
  mode: "up-to-date" | "dry-run" | "applied";
};

export function planSeed(
  local: Readonly<Record<string, unknown>>,
  remote: readonly RemoteItem[],
): SeedPlan {
  const remoteMap = new Map<string, unknown>();
  for (const item of remote) {
    remoteMap.set(item.key, item.value);
  }

  const create: CreateOperation[] = [];
  const keepExisting: string[] = [];
  const drifted: string[] = [];

  for (const [key, value] of Object.entries(local)) {
    if (remoteMap.has(key)) {
      keepExisting.push(key);
      if (!isDeepStrictEqual(value, remoteMap.get(key))) {
        drifted.push(key);
      }
    } else {
      create.push({ operation: "create", key, value });
    }
  }

  const localKeySet = new Set(Object.keys(local));
  const seenRemote = new Set<string>();
  const remoteOnly: string[] = [];

  for (const item of remote) {
    if (!localKeySet.has(item.key) && !seenRemote.has(item.key)) {
      seenRemote.add(item.key);
      remoteOnly.push(item.key);
    }
  }

  return {
    create,
    keepExisting,
    drifted,
    remoteOnly,
  };
}

export async function seedEdgeConfig(args: {
  local: Readonly<Record<string, unknown>>;
  target: RemoteTarget;
  apply: boolean;
  fetchImpl?: typeof fetch;
  onPlan?: (plan: SeedPlan) => void;
}): Promise<SeedResult> {
  for (const key of Object.keys(args.local)) {
    if (!EDGE_CONFIG_KEY_PATTERN.test(key)) {
      throw new Error(
        `Invalid Edge Config key: "${key}" does not match pattern ${EDGE_CONFIG_KEY_PATTERN.source}`,
      );
    }
  }

  const initialItems = await fetchRemoteItems(args.target, args.fetchImpl);
  const plan = planSeed(args.local, initialItems);

  args.onPlan?.(plan);

  if (plan.create.length === 0) {
    return { ...plan, mode: "up-to-date" };
  }

  if (!args.apply) {
    return { ...plan, mode: "dry-run" };
  }

  await createRemoteItems(args.target, plan.create, args.fetchImpl);

  const postItems = await fetchRemoteItems(args.target, args.fetchImpl);
  const postKeys = new Set(postItems.map((item) => item.key));
  const missingCreatedKeys = plan.create.filter((op) => !postKeys.has(op.key));

  if (missingCreatedKeys.length > 0) {
    throw new Error(
      `Post-write verification failed: created keys missing from remote store: ${missingCreatedKeys.map((op) => op.key).join(", ")}`,
    );
  }

  return { ...plan, mode: "applied" };
}
