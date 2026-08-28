# Developing with Prisma

> [!IMPORTANT]
> Prisma uses a `.env` file to load environment variables. Running migration
> will change the database schema and data listed under `$DATABASE_URL` and
> `$DIRECT_URL` in `.env`. Make sure to have the correct `.env` file before
> running any migration commands.
>
> For local development, you can use the `.env.example` file as a template. Copy
> the file and rename it to `.env` then fill in the necessary values.
> `$DATABASE_URL` and `$DIRECT_URL` should have the following value:
>
> ```sh
> "postgres://${POSTGRES_DB}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/postgres"
> ```

## Prerequisites

- correct copy of `.env` file
- `docker-compose`
- `prisma` (via running `bun install` from project root)

## Schema and Data Migrations

### Schema Migrations

To apply schema migrations, make changes at `schema.prisma` then run the
following command:

```sh
bunx prisma migrate dev
```

See [Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate) for more
details.

> Prisma 7 uses `prisma.config.ts` (`defineConfig` with `DIRECT_URL`) and
> `@prisma/adapter-pg`; the generated client lives at `src/generated/prisma`.

### Data Migrations

To apply data migrations, make changes at `prisma/seed.ts` then run the
following command:

```sh
# applies the seed
bunx prisma db seed
```

or

```sh
# resets the database and applies the seed
bunx prisma migrate reset
```

See [Prisma
Seeding](https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding) for
more details.
