# Carla Stine artwork site

TanStack Start and React on Cloudflare Workers, with Postgres on Neon through Hyperdrive, private R2 image storage, Cloudflare Images transformations, and Better Auth magic links through Resend.

The current Cloudflare target is **staging**. It does not replace the Squarespace site at `carlastine.com`.

## Local development

Install dependencies with pnpm, then copy `.dev.vars.example` to `.dev.vars` and provide local secrets. Files containing credentials are gitignored.

- `wrangler.jsonc` configures the local Hyperdrive connection. Override it with `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` when needed.
- Put the direct Postgres connection string in `.env.local` as `DATABASE_URL` (or `DATABASE_URL_UNPOOLED`) for the migration runner. Do not use Neon's pooled endpoint: migrations hold a session advisory lock.
- Put the public Turnstile site key in `.env.local` as `VITE_TURNSTILE_SITE_KEY`. It is compiled into the browser bundle and must allow the hostname being tested.
- `.dev.vars` provides Worker secrets; `.env.local` provides migration and build settings. Neither is uploaded as a secret store during deployment.

```sh
pnpm run db:migrate
pnpm run dev
```

R2 uses local emulation during development. Cloudflare Images local emulation may differ from the deployed service; check transformed images on staging before signing off.

## Validation

Tests use a dedicated Postgres database whose name contains `test`. The test setup creates it and applies migrations. Never point the tests at staging data.

```sh
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/carla_test pnpm run test
pnpm run typecheck
pnpm run lint
pnpm exec oxfmt --check
pnpm run build
```

## Cloudflare staging

Before the first deployment:

1. Create an empty Neon Postgres database and apply the existing SQL migrations. Existing Railway test data is intentionally discarded.
2. Create a Hyperdrive configuration using the direct Neon endpoint, with query caching disabled so admin changes and authentication reads are current. Replace the placeholder Hyperdrive ID in `wrangler.jsonc`.
3. Enable R2 and create the private `carla-site-staging-images` bucket. The `ARTWORK_IMAGES` binding grants the Worker access; no public bucket URL is required.
4. Enable the Cloudflare Images service as required by the account and retain the `IMAGES` binding.
5. Set fresh Worker secrets: `BETTER_AUTH_SECRET`, `ADMIN_EMAIL`, `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, `CONTACT_EMAIL_TO`, and `TURNSTILE_SECRET_KEY`. Configure `BETTER_AUTH_URL` for the staging URL. Create a Turnstile widget allowing that hostname and supply its public key at build time.

Build before deploying. The deployment script applies database migrations before uploading the Worker:

```sh
pnpm run build
pnpm run deploy
```

The intended staging URL is `https://carla-site-staging.13zebras.workers.dev`.

Uploaded artwork and about images use their storage paths to build same-origin `/media/` URLs. The Worker reads private R2 objects and applies supported image transformations. Oversized or unsupported transformation inputs fall back to the original image. Existing repo assets such as fonts and logos use Workers static assets.

Verify public pages, admin magic-link sign-in, upload/edit/delete, image variants and contact delivery before connecting a custom domain. Email tests that send real messages require user authorization. Railway deletion is handled by the user; the Squarespace domain remains unchanged.
