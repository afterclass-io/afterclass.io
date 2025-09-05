# Development Guide

## Getting Started

### Branching Strategy

Refer to our [[RFC] Branching Strategy
#66](https://github.com/AfterClass-io/afterclass.io-v2/discussions/66) for more
information on how to work with branches in this project.

### Prerequisites

- [Node.js](https://nodejs.org/en/) >= v20.x
- [Bun](https://bun.sh/) >= v1.1.x
- [Docker](https://www.docker.com/) and [Docker
  Compose](https://docs.docker.com/compose/) to spin up a local database

Clone the project

```sh
git clone <PROJECT_URL>
```

Install dependencies

```sh
bun install
```

Ensure you have the `.env` file in the root directory. You can copy the
`.env.example` file and rename it to `.env`.

```sh
cp .env.example .env
```

> [!TIP]
> For development, you can use the default values in the `.env.example`
> file. However, you may need to update the `DATABASE_URL` if you are using a
> different database.

#### Ignoring Automated Code Formatting in Git Blame

With automated code formatting, we sometimes expect large changes in pull
requests. We have a [`.git-blame-ignore-revs`](.git-blame-ignore-revs) file to
ignore formatting changes. To make this file used by `git blame`, you need to
run the following command.

```sh
git config --local blame.ignoreRevsFile .git-blame-ignore-revs
```

### Installing Recommended VSCode Settings & Extensions

To ensure a consistent development experience, we recommend installing the
recommended settings and extensions for VSCode. You can find the settings in the
[.vscode](.vscode) folder.

### Running the database

Start the database

```sh
docker-compose up
```

> [!TIP]
> On first run, you will need to run the migrations to create the
> database schema


> [!TIP]
> If you're using Supabase for your Postgres database, go to the [connect](https://supabase.com/dashboard/project/_?showConnect=true) tab and use the Transaction Pooler configuration details. Postgres host should be something like `aws-1-ap-southeast-1.pooler.supabase.com`.

```sh
bunx prisma migrate dev
```

Only needs to be done once. This command will create the database schema and
seed the database with some initial data.

If data is not seeded, run `bun run prisma/seed.ts`.


> [!TIP]
> The seed data are in the [`prisma/data`](prisma/data/) directory's json
> files and populated using the [`prisma/seed.ts`](prisma/seed.ts) via a command
> defined in [`package.json`](package.json) at the `prisma.seed` section. You
> can modify these file to update seed data.

To destroy the database and remove all data

```sh
docker-compose down -v
```

See the [docker compose documentation](https://docs.docker.com/compose/) for
more information on how to use docker compose.

### Running the project

Start the development server

```sh
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the
result.

### Running the Storybook

[Storybook](https://github.com/storybookjs/storybook) is a frontend playground we use to test components in isolation.

Start the Storybook server

```sh
bun run storybook
```

Open [http://localhost:6006](http://localhost:6006) with your browser to see the
result.

See the [Storybook documentation](https://storybook.js.org/docs/get-started) for
more information on how to use Storybook.

## Project Structure

Refer to the [Project Architecture](ARCHITECTURE.md) guide for more information.

## Developing with: Icons

### How do I use icons from libraries like mdi or other libs?

We are using a library called Iconify.

On Figma, if the icon layer name is formatted like `uil:chart-line`, then it's
likely using an icon from Iconify. Otherwise, see below for custom icon
implementation.

Please also refer to Iconify guide
[here](https://github.com/iconify/iconify/tree/main/iconify-icon/react)

### How do I create custom icons that are not from Iconify?

Refer to the README
[here](https://github.com/AfterClass-io/afterclass.io-v2/tree/main/src/common/components/CustomIcon/README.md)

## Developing with: Theming System

Our theming system uses the Tailwind Plugin function to generate 2 things

- CSS variables for each token in figma
- Tailwind classes for these tokens

### How do I use the theme colours?

VSCode should grab and expose the colours from the theming system with
autocomplete support. You need the [Tailwind CSS IntelliSense VSCode
Extension](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss).

Alternatively, you can refer to `common/tools/tailwind/themes/appTheme.ts` for
the theming tailwind config and available classes.

### What not to do

#### Avoid using `bg-light-*` or `bg-dark-*`

Even though the theming system exposes classes like `bg-light-primary-default`
or `bg-dark-primary-default`, use only `bg-app-primary-default`. The additional
light/dark prefix colours are for granular theming possibilities, like when
certain components need a certain token.

### How does the theming system work?

Based on the parent's className `light` or `dark`, the tailwind classes will use
a different set of color variables.

E.g. We use 1 class for both light or dark colours, such as
`bg-app-primary-default`. This class points to a CSS variable like so
`primary-default: 'var(--app-primary-default)`. Based on whether the parent has
`.dark` or `.light` class, the class contains CSS variables that will override
and apply the correct colour.

It also works with opacity, so you could do `bg-app-primary-default/50` if you'd
like.

### Forcing a component to be of a different theme

Just add something like `data-theme="dark"` to the HTML attributes, and it'll
use the variables from that theme. You can also use classNames like `dark` or
`light`.

### Where are the theming files located?

All Tailwind theming files are configured in the monorepo's
`common/tools/tailwind` folder.

### How do I modify the theme or the colours?

If you're adding a new key or token, make sure to modify all the themes found in
`/common/tools/tailwind/themes` so they have the same set of keys.

If you're updating a certain theme's color code, just find the theme in
`/common/tools/tailwind/themes` and paste the HEX code there.
