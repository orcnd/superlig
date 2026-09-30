# Repository-owned raw data

`data/raw/` contains immutable source snapshots represented as JSON. `data/normalized/` contains deterministic application-ready derivatives.

## Refresh

```bash
npm run data:import:tff
```

The importer downloads official TFF fixture pages, decodes their Windows-1254 content, extracts stable TFF club/match identifiers and writes:

- `data/raw/tff/fixtures-<season>.json`: all league fixtures/results, with source metadata.
- `data/raw/tff/match-details-<season>.json`: four-big-team match dates, referee crews, starting elevens, benches, player card events and goal types (including TFF's penalty marker).
- `data/normalized/big-four-matches.json`: matches involving GS, FB, BJK or TS.
- `data/sources-manifest.json`: URL, retrieval time, record count and SHA-256 hash.

Raw records are committed to Git so a build never depends on live scraping. Refreshes are explicit and reviewable. TFF card, goal and lineup records are imported from match details. League rest intervals, pre-match opponent form, post-card lineup absence and lineup continuity are deterministic derivatives. A missing player is never labelled as medically injured without a source; VAR assignments are recorded, but decision correctness is not inferred.
