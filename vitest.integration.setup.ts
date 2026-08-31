import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    dbUrl: string;
    // Shared seed rows. `Universities.abbrv` is a unique enum with only 3
    // values, so integration test files can't each create their own university
    // when Vitest runs them in parallel against one container — they inject
    // these instead.
    universityId: number;
    facultyId: number;
    acadTermId: string;
  }
}

export default async function setup(project: TestProject) {
  const container = await new PostgreSqlContainer("postgres:18-alpine").start();
  const dbUrl = container.getConnectionUri();

  execSync("bunx prisma migrate deploy", {
    // eslint-disable-next-line node/no-process-env
    env: { ...process.env, DATABASE_URL: dbUrl, DIRECT_URL: dbUrl },
    stdio: "inherit",
  });

  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: dbUrl }),
  });
  const suffix = randomUUID();
  const university = await db.universities.create({
    data: {
      name: `Test University ${suffix}`,
      abbrv: "SMU",
      siteUrl: `https://${suffix}.example.edu`,
    },
  });
  const faculty = await db.faculties.create({
    data: {
      name: "Test Faculty",
      acronym: suffix.slice(0, 8),
      siteUrl: "https://faculty.example.edu",
      belongToUniversityId: university.id,
    },
  });
  const acadTerm = await db.acadTerm.create({
    data: {
      id: `AY-${suffix.slice(0, 8)}`,
      acadYearStart: 2024,
      acadYearEnd: 2025,
      term: "1",
      bossId: Math.floor(Math.random() * 1_000_000_000),
      startDt: new Date("2024-08-01"),
      endDt: new Date("2024-12-01"),
    },
  });
  await db.$disconnect();

  project.provide("dbUrl", dbUrl);
  project.provide("universityId", university.id);
  project.provide("facultyId", faculty.id);
  project.provide("acadTermId", acadTerm.id);

  return async () => {
    await container.stop();
  };
}
