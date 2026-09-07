import { createCallerForUser } from "../caller";
import type { SessionUser } from "@/server/auth/config";
import type { ToolContext } from "../types";

/**
 * Shared fake ToolContext for catalog-tool tests (Task 10).
 *
 * Wraps the REAL `createCallerForUser` (same entry the MCP `buildToolContext`
 * and the chat route use), so unstubbed routers are live RouterCaller
 * namespaces — not hand-built partials. Per-router procedure stubs win over
 * the real procedures; everything unstubbed delegates to the live caller
 * (which never touches the DB unless a test actually invokes it).
 *
 * Mechanics (verified by probes, 2026-09-07 — do not "simplify"):
 * - A real tRPC caller is a FUNCTION proxy (`typeof caller === "function"`)
 *   with non-enumerable router namespaces (`{...caller}` === `{}`), and
 *   every `get` returns a FRESH object — so direct assignment and spreading
 *   both silently vanish. Hence Proxies, not assignment, at both levels.
 * - The root stays a pass-through Proxy over the real caller: unstubbed
 *   members return the IDENTICAL live values (identity preserved — dispatch's
 *   `isToolContext` guard and router `user` path fields keep working).
 * - Each stubbed namespace is re-presented as a Proxy over `{}` (plain
 *   object): stubs win, misses delegate live to the real namespace. One
 *   cached proxy per namespace per context, so post-hoc
 *   `ctx.caller.x.proc = vi.fn()` overrides land on the same stubs map the
 *   next read sees. Nothing leaks across tests: each factory call gets a
 *   fresh stubs store.
 * - `then` resolves to `undefined` so awaiting a context never mistakes the
 *   caller for a thenable.
 */
export type FakeCallerStubs = Record<string, Record<string, unknown>>;

export interface MakeFakeToolContextOptions {
  /** Merged over the default fake user (id "u1"). */
  user?: Partial<SessionUser>;
  /**
   * Per-router procedure stubs, e.g. `{ timetable: { searchCourses: vi.fn() } }`.
   *
   * REQUIRED for every procedure the exercised path invokes: unstubbed
   * procedures are LIVE (same test-session caller the chat route builds —
   * probe5 verified `acadTerms.current()` resolves against the real test
   * DB). Live delegation is the point (no hand-built partials), but a test
   * that lets a write procedure go live would mutate the developer DB —
   * stub every procedure on the path, exactly like the old hand-built
   * callers did.
   */
  caller?: FakeCallerStubs;
}

const DEFAULT_USER: SessionUser = {
  id: "u1",
  email: "a@smu.edu.sg",
  username: "u1",
  isVerified: true,
  universityId: 1,
  firstName: null,
  lastName: null,
  telegramId: null,
  photoUrl: null,
  facultyId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * Present one router namespace: stubbed procedures win, everything else
 * (live procedures, router path fields like `user`) delegates to the real
 * namespace. `set` lands on the same stubs map `get` reads, so post-hoc
 * `ctx.caller.x.proc = vi.fn()` overrides work.
 *
 * Reflective reads MUST forward to the real namespace, never the stubs
 * store: assertion printers walk `Symbol.toPrimitive` / `toString` /
 * `valueOf` on the context graph (e.g. `expect(fn).toHaveBeenCalledWith(ctx,
 * ...)`), and the tRPC proxy answers those from its procedure-path
 * machinery — answering from a plain-object proxy throws `TypeError: Cannot
 * convert object to primitive value` / `TRPCError: No procedure found on
 * path "name,toString"`.
 */
function stubbedRouter(
  realRouter: unknown,
  stubs: Record<string, unknown>,
): Record<string, unknown> {
  const source: Record<PropertyKey, unknown> =
    realRouter !== null &&
    (typeof realRouter === "object" || typeof realRouter === "function")
      ? (realRouter as Record<PropertyKey, unknown>)
      : {};
  // String-keyed members the tRPC proxy synthesizes WITHOUT a procedure
  // `_def` (path fields like `user`, plus Object-prototype members): never
  // treat them as stub-overwritable procedures.
  //
  // `toString`/`valueOf` need special care: on a NAMESPACE they resolve to
  // live tRPC path functions, and vitest's `toHaveBeenCalledWith(ctx, ...)`
  // pretty-printer CALLS them (probes 6-8) — the forwarded function then
  // throws `TRPCError: No procedure found on path "name,toString"`, and the
  // printer ALSO reaches them via `getOwnPropertyDescriptor(...).value`,
  // so both the `get` AND the descriptor trap must answer printer-safe.
  // Answer: plain Object.prototype members bound to the `{}` target (never
  // invoke the tRPC function — it is an async procedure proxy whose
  // rejection surfaces as an unhandled error). Probe 8: Symbol.toPrimitive
  // is undefined on namespaces, so the printer falls back to these two —
  // covering them is sufficient.
  //
  // Everything else reflective-shaped forwards live: a test calling it got
  // the real caller semantics before, and keeps them now.
  const PRINTER_SAFE = new Set(["toString", "valueOf"]);
  const safeReflective = (v: unknown, prop: string): unknown => {
    if (typeof v !== "function") return v;
    if (PRINTER_SAFE.has(prop)) {
      // (probe 7: calling the forwarded tRPC function queues a rejected
      // "No procedure found" promise = unhandled rejection, even though the
      // call itself returns a value. Never invoke it.)
      const plain = (
        Object.prototype as unknown as Record<
          string,
          (...a: unknown[]) => unknown
        >
      )[prop];
      return (...args: unknown[]) => plain?.apply({}, args);
    }
    return v;
  };
  // getOwnPropertyDescriptor MUST also answer printer-safe for toString /
  // valueOf: pretty-format reads the descriptor and calls
  // `descriptor.value` — without this trap it reaches the live tRPC path
  // function and the same unhandled rejection returns.
  const printerSafeDescriptor = (
    prop: string,
  ): PropertyDescriptor | undefined => {
    if (!PRINTER_SAFE.has(prop)) return undefined;
    const plain = (
      Object.prototype as unknown as Record<string, (...a: unknown[]) => unknown>
    )[prop];
    if (typeof plain !== "function") return undefined;
    return {
      configurable: true,
      enumerable: false,
      writable: true,
      value: (...args: unknown[]) => plain.apply({}, args),
    };
  };
  const isLiveReflective = (v: unknown): boolean =>
    typeof v === "function" &&
    (v as { _def?: unknown })._def === undefined &&
    typeof (v as { _def?: unknown })._def !== "object";
  return new Proxy({} as Record<string, unknown>, {
    get: (_target, prop) => {
      if (typeof prop !== "string") return Reflect.get(source, prop);
      if (hasOwn(stubs, prop)) return stubs[prop];
      const v = source[prop];
      // Reflective-shaped members forward through the printer-safe wrapper
      // so assertion printers never trip the tRPC path machinery.
      if (isLiveReflective(v)) return safeReflective(v, prop);
      return v;
    },
    set: (_target, prop, value) => {
      // Procedure-level post-hoc overrides land on the stubs map. The
      // reflective members above are get-only: writing them would shadow
      // the live tRPC machinery with a dead value, so refuse loudly.
      if (typeof prop !== "string") return false;
      if (!isLiveReflective(source[prop])) {
        stubs[prop] = value;
        return true;
      }
      return false;
    },
    has: (_target, prop) =>
      (typeof prop === "string" && hasOwn(stubs, prop)) || prop in source,
    getOwnPropertyDescriptor: (_target, prop) => {
      if (typeof prop === "string") {
        if (hasOwn(stubs, prop))
          return {
            configurable: true,
            enumerable: true,
            writable: true,
            value: stubs[prop],
          };
        const printer = printerSafeDescriptor(prop);
        if (printer) return printer;
      }
      return Reflect.getOwnPropertyDescriptor(source, prop);
    },
  });
}

export async function makeFakeToolContext(
  opts: MakeFakeToolContextOptions = {},
): Promise<ToolContext> {
  const user: SessionUser = { ...DEFAULT_USER, ...opts.user };
  const real = createCallerForUser(user);
  const seed: FakeCallerStubs = opts.caller ?? {};
  // One stubs map + one cached proxy per stubbed namespace: re-entrant
  // reads see the same stubs, post-hoc writes land on the same map.
  const stores = new Map<string, Record<string, unknown>>();
  const proxies = new Map<string, Record<string, unknown>>();
  const forNamespace = (ns: string): Record<string, unknown> => {
    let stubs = stores.get(ns);
    if (!stubs) {
      stubs = { ...(seed[ns] ?? {}) };
      stores.set(ns, stubs);
    }
    let proxy = proxies.get(ns);
    if (!proxy) {
      proxy = stubbedRouter(
        Reflect.get(real.caller as unknown as object, ns),
        stubs,
      );
      proxies.set(ns, proxy);
    }
    return proxy;
  };
  const stubbedNamespaces = new Set(Object.keys(seed));
  // Symbol-keyed and reflective reads MUST forward to the real caller (never
  // the stubs store): `expect(...).toHaveBeenCalledWith(ctx, ...)` and
  // assertion printers walk `Symbol.toPrimitive` / `toString` / `valueOf` /
  // `Symbol.for("nodejs.util.inspect.custom")` on the context graph, and the
  // tRPC proxy answers those from its procedure-path machinery. Answering
  // them from a stubs-map lookup (or a plain-object proxy) throws
  // `TypeError: Cannot convert object to primitive value` / `TRPCError: No
  // procedure found on path "name,toString"`.
  const caller = new Proxy(real.caller, {
    get: (target, prop, receiver) => {
      if (typeof prop !== "string") return Reflect.get(target, prop, receiver);
      if (prop === "then") {
        // Never thenable: awaiting a ToolContext must resolve the context,
        // not mistake the caller for a promise.
        return undefined;
      }
      const realValue = Reflect.get(target, prop, receiver);
      // Every RouterCaller member is a router namespace (procedures live
      // one level down): re-present namespaces as plain-object proxies so
      // post-hoc stub overrides work and the verbatim contract
      // (`typeof caller.<router> === "object"`) holds. Scalars pass
      // through untouched.
      if (
        realValue !== null &&
        (typeof realValue === "object" || typeof realValue === "function")
      ) {
        if (!stores.has(prop)) {
          // Lazily stub-ify on first read so unstubbed namespaces keep
          // working AND gain the override surface; the cached proxy keeps
          // re-entrant reads identical.
          stores.set(prop, { ...(seed[prop] ?? {}) });
        }
        stubbedNamespaces.add(prop);
        return forNamespace(prop);
      }
      return realValue;
    },
    set: (_target, prop, value) => {
      // Post-hoc namespace replacement (`ctx.caller.x = ...`) is a test
      // bug magnet (it would orphan the stubs map); route procedure-level
      // writes through the namespace proxy instead. Accept router-level
      // stubs here by merging into the map so the failure mode is loud
      // only if someone replaces a whole namespace with a non-object.
      if (typeof prop === "string") {
        stubbedNamespaces.add(prop);
        const stubs = stores.get(prop) ?? {};
        if (value !== null && typeof value === "object")
          Object.assign(stubs, value as Record<string, unknown>);
        stores.set(prop, stubs);
        proxies.delete(prop);
        return true;
      }
      return false;
    },
    has: (target, prop) =>
      (typeof prop === "string" && stubbedNamespaces.has(prop)) ||
      Reflect.has(target, prop),
  });
  return { user, caller: caller as unknown as ToolContext["caller"] };
}
