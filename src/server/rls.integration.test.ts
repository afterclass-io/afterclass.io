import { beforeAll, describe, expect, it } from "vitest";
import type { Prisma } from "@/generated/prisma/client";
import { idb, seedUser } from "@/server/api/integration-test-helpers";

type ApiRole = "anon" | "authenticated";
const API_ROLES: readonly ApiRole[] = ["anon", "authenticated"];

class RollbackError extends Error {
  constructor() {
    super("Rollback");
    this.name = "RollbackError";
  }
}

async function withRollback<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  let result: T;
  try {
    await idb.$transaction(async (tx) => {
      result = await fn(tx);
      throw new RollbackError();
    });
  } catch (error) {
    if (
      error instanceof RollbackError ||
      (error instanceof Error && error.name === "RollbackError")
    ) {
      return result!;
    }
    throw error;
  }
  return result!;
}

// Runs `fn` inside one transaction as `role`, then always rolls back.
async function asRole<T>(
  role: ApiRole,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return withRollback(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL ROLE ${role}`);
    return fn(tx);
  });
}

beforeAll(async () => {
  const roles = await idb.$queryRaw<{ rolname: string }[]>`
    SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')
  `;
  if (roles.length < 2) {
    throw new Error("Mock Supabase roles missing: the RLS guard cannot run");
  }
  await seedUser(idb);
});

describe("Row Level Security and API role privileges", () => {
  it("every public table has RLS", async () => {
    const tables = await idb.$queryRaw<
      { relname: string; relrowsecurity: boolean }[]
    >`
      SELECT c.relname, c.relrowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
      ORDER BY c.relname
    `;
    expect(tables.length).toBeGreaterThan(0);
    expect(tables.map((t) => t.relname)).toEqual(
      expect.arrayContaining(["users", "_prisma_migrations"]),
    );
    expect(
      tables.filter((t) => !t.relrowsecurity).map((t) => t.relname),
    ).toEqual([]);
  });

  it("no table uses FORCE", async () => {
    const tables = await idb.$queryRaw<
      { relname: string; relforcerowsecurity: boolean }[]
    >`
      SELECT c.relname, c.relforcerowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
      ORDER BY c.relname
    `;
    expect(
      tables.filter((t) => t.relforcerowsecurity).map((t) => t.relname),
    ).toEqual([]);
  });

  it("API roles hold no table right", async () => {
    const open: string[] = [];
    for (const role of API_ROLES) {
      const rows = await idb.$queryRaw<
        { relname: string; hasPrivilege: boolean }[]
      >`
        SELECT c.relname,
               has_table_privilege(${role}, c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') AS "hasPrivilege"
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
        ORDER BY c.relname
      `;
      for (const row of rows) {
        if (row.hasPrivilege) {
          open.push(`${role}.${row.relname}`);
        }
      }
    }
    expect(open).toEqual([]);
  });

  it("API roles hold no sequence right", async () => {
    const open: string[] = [];
    for (const role of API_ROLES) {
      const rows = await idb.$queryRaw<
        { relname: string; hasPrivilege: boolean }[]
      >`
        SELECT c.relname,
               has_sequence_privilege(${role}, c.oid, 'USAGE,SELECT,UPDATE') AS "hasPrivilege"
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'S'
        ORDER BY c.relname
      `;
      for (const row of rows) {
        if (row.hasPrivilege) {
          open.push(`${role}.${row.relname}`);
        }
      }
    }
    expect(open).toEqual([]);
  });

  it("API roles cannot execute any non-extension function", async () => {
    const fns = await idb.$queryRaw<{ oid: number; proname: string }[]>`
      SELECT p.oid, p.proname
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND NOT EXISTS (
          SELECT 1 FROM pg_depend d
          WHERE d.classid = 'pg_proc'::regclass
            AND d.objid = p.oid
            AND d.deptype = 'e'
        )
      ORDER BY p.proname
    `;
    expect(fns.length).toBeGreaterThanOrEqual(5);

    const open: string[] = [];
    for (const role of API_ROLES) {
      const rows = await idb.$queryRaw<
        { proname: string; hasPrivilege: boolean }[]
      >`
        SELECT p.proname,
               has_function_privilege(${role}, p.oid, 'EXECUTE') AS "hasPrivilege"
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND NOT EXISTS (
            SELECT 1 FROM pg_depend d
            WHERE d.classid = 'pg_proc'::regclass
              AND d.objid = p.oid
              AND d.deptype = 'e'
          )
        ORDER BY p.proname
      `;
      for (const row of rows) {
        if (row.hasPrivilege) {
          open.push(`${role}.${row.proname}`);
        }
      }
    }
    expect(open).toEqual([]);
  });

  it("anon cannot read users", async () => {
    await expect(
      asRole("anon", (tx) => tx.$queryRaw`SELECT id FROM users LIMIT 1`),
    ).rejects.toThrow(/permission denied|42501/i);
    await expect(
      asRole(
        "authenticated",
        (tx) => tx.$queryRaw`SELECT id FROM users LIMIT 1`,
      ),
    ).rejects.toThrow(/permission denied|42501/i);
  });

  it("RLS alone blocks rows (independent lock)", async () => {
    const counts = await idb.$queryRaw<{ count: bigint | number }[]>`
      SELECT count(*) FROM users
    `;
    expect(counts[0]).toBeDefined();
    expect(Number(counts[0]!.count)).toBeGreaterThanOrEqual(1);

    const rows = await withRollback(async (tx) => {
      await tx.$executeRawUnsafe("GRANT SELECT ON users TO anon");
      await tx.$executeRawUnsafe("SET LOCAL ROLE anon");
      return tx.$queryRaw<{ id: string }[]>`SELECT id FROM users`;
    });
    expect(rows).toHaveLength(0);
  });

  it("new tables start closed", async () => {
    const result = await withRollback(async (tx) => {
      await tx.$executeRawUnsafe("CREATE TABLE public.rls_probe (id int)");
      const anons = await tx.$queryRaw<{ hasPrivilege: boolean }[]>`
        SELECT has_table_privilege('anon', 'public.rls_probe', 'SELECT,INSERT,UPDATE,DELETE') AS "hasPrivilege"
      `;
      const auths = await tx.$queryRaw<{ hasPrivilege: boolean }[]>`
        SELECT has_table_privilege('authenticated', 'public.rls_probe', 'SELECT,INSERT,UPDATE,DELETE') AS "hasPrivilege"
      `;
      return {
        anon: anons[0]?.hasPrivilege ?? false,
        auth: auths[0]?.hasPrivilege ?? false,
      };
    });

    expect(result.anon).toBe(false);
    expect(result.auth).toBe(false);
  });
});
