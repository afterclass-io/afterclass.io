# Architecture

## Principles

1. Keep it pragmatically simple.
2. Make it easy to contribute.
3. Open source, open data, open community.
4. Have fun and learn something new.

These principles guide our decisions on what to build, how to build it, and how
to work together.

## Stack

This project is built on top of the [T3
Stack](https://create.t3.gg/en/introduction). With the following core
technologies:

- [TypeScript](https://www.typescriptlang.org/) - Statically typed JavaScript
- [Bun](https://bun.sh/) - Dependency management (not runtime)

### Frontend

- [Next.js](https://nextjs.org/) - React framework
- [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS framework
- [RadixUI](https://www.radix-ui.com/) & [Shadcn](https://shadcn.com/) -
  Composition-first UI libraries

### Backend

- [Next.js Api Routes](https://nextjs.org/docs/api-routes/introduction) -
  Serverless API endpoints _(used with tRPC)_
- [tRPC](https://trpc.io/) - TypeScript RPC, a framework for building type-safe
  APIs
- [PrismaORM](https://www.prisma.io/) - Modern database access for TypeScript &
  Node.js
- [NextAuth](https://next-auth.js.org/) - Authentication for Next.js
- [Supabase](https://supabase.com/) - The open source Firebase alternative for
  PostgreSQL

### Dev Tools

- [oxlint](https://oxc.rs/docs/guide/usage/linter) - Fast Rust-based linter for
  TypeScript and TSX
- [oxfmt](https://oxc.rs/) - Fast Rust-based code formatter
- [Storybook](https://storybook.js.org/) - UI component explorer
- [Docker](https://www.docker.com/) - Containerized development environment

## Project Structure

```txt
.
├── prisma/
│   ├── data/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
├── public/
└── src/
    ├── app/
    │   └── ...
    ├── common/
    │   ├── components/
    │   ├── constants/
    │   ├── fonts/
    │   ├── functions/
    │   ├── hooks/
    │   ├── providers/
    │   ├── styles/
    │   ├── tools/
    │   └── types/
    ├── modules/
    │   ├── bidding/          # bid results, predictions, charts
    │   ├── home/
    │   ├── reviews/          # ReviewItem, voting, reactions
    │   ├── roadmaps/         # roadmap grid/timeline, progress sync, sharing
    │   ├── sharing/          # iCal, link-share, visibility
    │   ├── submit/
    │   └── timetable/        # plans, slots, BidDialog, calendar export
    └── server/
        ├── api/
        │   ├── root.ts
        │   ├── routers/
        │   │   └── ...
        │   └── trpc.ts
        ├── auth.ts
        ├── db.ts
        └── supabase.ts
```

For guides on how to work with the project structure, refer to the various
READMEs in that subdirectory.
