# Deployment Guide

This project is deployed using [Vercel](https://vercel.com/). Vercel is a cloud
platform for static sites and Serverless Functions that fits perfectly with
Next.js.

The project uses [Supabase](https://supabase.com) as the PostgreSQL database
hosting provider.

## Git Tags and Releases

If you have publish access, the steps below explain how to push a release for
this project.

### Creating a new release

We use Git Tags to mark new releases. To create a new release, please use the
[GitHub Release
Page](https://github.com/AfterClass-io/afterclass.io-v2/releases/new):

1. Click on `Choose a tag`.
2. Determine what version this release is. If it is a major, minor, or patch
   release. Refer to the [Semantic Versioning](https://semver.org/) when making
   this decision.
3. Enter the version number in the input field. For example, `v1.0.0`.
4. Click on `Create a new tag: on publish`.
5. Click on `Generate release notes`.
6. Verify the release notes.
7. Click on `Publish release`.

Pushing Git Tags to main will trigger the GitHub Actions to deploy the project
to the production environment and promote it as the latest production version.
See section on [Vercel deployment](#vercel) for more information. A pull request
will also be created with release notes.

### Deleting a release

Sometimes the odds are just not in your favor, and you may need to delete a
release. To delete a release, please use the [GitHub Release
Page](https://github.com/AfterClass-io/afterclass.io-v2/releases) and follow the
steps below:

1. Click on the release you want to delete.
2. Click on the `Delete` icon button.
3. Confirm the deletion is correct.
4. Click on `Delete this release`.
5. Click on the `Tags` tab.
6. On the right side of the tag, click on the `...` icon button.
7. Click on `Delete tag`.
8. Confirm the deletion is correct.

### Versioning

We abide by [Semantic Versioning](https://semver.org/) to version our releases.
For the versions available, see the [tags on this
repository](https://github.com/AfterClass-io/afterclass.io-v2/tags).

## Release Notes

Release notes are automatically generated using the GitHub UI. When creating a
new release, please ensure that the release notes are accurate and informative.

Once a release is created with a corresponding git tag, the release notes will
be automatically added to the release page and the
[`CHANGELOG.md`](CHANGELOG.md) will be updated. Afterwhich, a pull request will
be created with the updated `CHANGELOG.md` file via a GitHub Action
[`changelog.yml`](.github/workflows/changelog.yml).

## Environment Variables

All project environment variables are stored in the `.env.example` file.

On top of the environment variables listed in the `.env.example` file, you will
need to add the following environment variables for GitHub Actions to work:

- `VERCEL_ORG_ID`: required for Vercel CLI to work
- `VERCEL_PROJECT_ID`: required for Vercel CLI to work
- `VERCEL_TOKEN`: required for Vercel CLI authentication
- `VERCEL_TEAM_NAME`: required for Vercel `Promote` CLI to work
- `CHROMATIC_PROJECT_TOKEN`: deploying storybooks to chromatic

## Vercel

### Deploying the project

On each push to any branch, Vercel will automatically deploy the project to the
preview environment.

This preview environment is a unique URL that allows you to test the changes
before merging them into the main branch. Once the changes are merged into the
main branch, Vercel will automatically deploy the project to the staging
environment.

After a new release is ready, creating a new release on GitHub with Tags will
trigger the [`promote-prod.yaml`](.github/workflows/promote-prod.yml) GitHub
action and Vercel will automatically deploy the project to the production
environment and promote it as the latest production version.

For more information, refer to the following resources:

- [Deploy based on tags/releases on
  Vercel](https://vercel.com/guides/can-you-deploy-based-on-tags-releases-on-vercel)
- [How can I use GitHub actions with
  Vercel](https://vercel.com/guides/how-can-i-use-github-actions-with-vercel)

## Supabase

This project uses Supabase as the database.

### Database Migrations

To run the database migrations, you will need the supabase database url as the
value of the `DATABASE_URL` environment variable.

Our project uses [PrismaORM](https://prisma.io) to manage database migrations.
To run the migrations, you can use the following command:

```sh
bunx prisma migrate dev
```

Refer to prisma's [migration
documentation](https://www.prisma.io/docs/orm/prisma-migrate/getting-started)
for more information on how to use prisma migrate.
