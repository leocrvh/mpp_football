# MPP Football GitHub Pages site

This repository publishes a lightweight static scoreboard page to the `gh-pages` branch.

The page shows:
- MPP league snapshot for `mpp_challenge_UC8MVG4F`
- FIFA World Cup 2026 schedule from community JSON data

## Automation

The workflow at `.github/workflows/update-data.yml` runs hourly (and on pushes to `main`) and executes `scripts/update-data.js`.

That script fetches:
- `https://mpp.football/leagues/mpp_challenge_UC8MVG4F`
- `https://raw.githubusercontent.com/mjwebmaster/world-cup-2026-schedule-data/main/world-cup-2026-schedule.json`

Then it updates `gh-pages` with:
- `/index.html`
- `/data/mpp_league.html`
- `/data/worldcup.json`

See `docs/USAGE.md` for setup.

## Attribution

World Cup 2026 schedule source:
- https://github.com/mjwebmaster/world-cup-2026-schedule-data
