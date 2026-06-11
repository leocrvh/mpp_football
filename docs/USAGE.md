# Usage

## 1) Enable GitHub Pages

In repository settings:
1. Go to **Settings → Pages**.
2. Set **Build and deployment** source to **Deploy from a branch**.
3. Select branch **gh-pages** and folder **/(root)**.
4. Save.

## 2) Run updates

The workflow runs automatically:
- every hour
- on pushes to `main`
- manually via **workflow_dispatch**

You can also run locally (push disabled):

```bash
DRY_RUN=1 node scripts/update-data.js
```

## 3) Data files

The published page reads local files in `gh-pages`:
- `data/mpp_league.html`
- `data/worldcup.json`

Placeholders in this branch are stored at:
- `site/data/mpp_league.html`
- `site/data/worldcup.json`
