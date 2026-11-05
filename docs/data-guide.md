# Match data guide

Each match is a separate, reviewed JSON file named after its stable `id` in `data/matches/`. Add shared teams, players, competitions and venues to the matching arrays in `data/entities.json` before referencing them. IDs use lowercase letters, digits and hyphens; names are display labels, not identity keys. Do not merge records based on names alone.

The following is a **synthetic format example only**—it is not a real attendance record and must not be copied as match history. Its entity IDs would first need matching entries in the shared entity collections.

```json
{
  "id": "synthetic-example-match",
  "date": "2024-01-02",
  "season": "2023/24",
  "status": "completed",
  "homeTeamId": "synthetic-home",
  "awayTeamId": "synthetic-away",
  "competitionId": "synthetic-cup",
  "venueId": null,
  "score": { "home": 2, "away": 1 },
  "extraTimePlayed": false,
  "shootout": null,
  "appearances": { "coverage": "unknown", "playerIds": [], "evidence": null },
  "events": null,
  "statistics": null,
  "provenance": { "kind": "manual" }
}
```

## Record rules

- Every match records a calendar date, nullable season, explicit status, home and away team IDs, competition ID, nullable venue, player-appearance coverage, and manual provenance.
- A `completed` match requires a score. `score` is the recorded final score including extra time, if played, and excluding shootout kicks. Store a shootout separately. Never use shootout kicks in goal totals.
- `unfinished`, `abandoned` and `disputed` records are allowed without a score and do not contribute to completed-score totals.
- Set `extraTimePlayed` to `true`, `false` or `null` when not known. Do not infer a season, venue, score, event or statistic.
- Appearance `playerIds` contain starters and substitutes who entered the pitch, each once. Unused substitutes are not appearances. `complete` means the list is complete; `partial` means it contains only confirmed players; `unknown` requires an empty list. Any confirmed player IDs require a non-empty `appearances.evidence` reference, which is shown with the player list.
- Events and statistics can be `null` when unavailable. Within a known but incomplete set, leave unknown values `null`; do not turn missing data into zero.
- Use a stable entity ID for every reference. Optional provider IDs are identity hints only and do not authorize a merge or provider refresh.

The `provenance.kind` value is currently `manual`. A public provider import, refresh path, credentials or automated generated-data commit is intentionally not configured: provider account coverage and public retention/display rights remain unverified. If those gates are later cleared, imported facts must remain separate from explicit manual corrections so refreshes cannot overwrite reviewed overrides.

## Validation and publishing

`npm run validate:data` checks the saved records, references and ID/file-name agreement. The pull-request workflow also runs tests, lint, type-checking and a static build. Configure its `Validate archive / validate` status check as required in the repository’s branch protection settings. The build reads only curated files; it must not fetch provider data.

Vercel Hobby Git integration, preview deployment, production branch and domain settings require account-side configuration and verification. Do not expose future import credentials to fork pull requests or PR-controlled code. A trusted enrichment flow must be independently approved and reviewed before it is added.
