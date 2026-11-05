# Seen from the Stands

A static, public archive of football matches attended in person. Match records and stable team, player, competition and venue identities live in Git; the site is generated at build time with Next.js static export.

## Run locally

```sh
npm ci
npm run dev
```

Before a change is reviewed, run `npm run validate:data`, `npm test`, `npm run lint`, `npm run typecheck` and `npm run build`.

## Add or correct a match

Add stable entity records to `data/entities.json`, then add one JSON file per match at `data/matches/<stable-id>.json`. Follow the record rules in [docs/data-guide.md](docs/data-guide.md). Keep uncertain facts `null`, use `unknown` coverage rather than zero, and record only players who actually entered the pitch. Corrections are reviewed edits to the curated record; no provider refresh currently runs.

The archive currently contains no attendance records. Its empty state is intentional; no real attendance history has been invented.

## Data and deployment limits

The GitHub Actions workflow validates submitted data and builds the static site without secrets or provider requests. API-Football enrichment is disabled until account coverage and public retention/display rights have been verified. Do not add API credentials or raw provider payloads to this repository. Vercel Git integration, preview deployments, production-branch settings and any required branch protection checks must be configured in the project owner’s accounts; none are implied by this source tree.
