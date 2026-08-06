# Contributing to Curtailment Tracker

Thanks for helping track wasted renewable energy. This project turns public ISO curtailment data into a simple daily view of where solar and wind generation is being reduced.

## What this repo does

- Serves a Next.js dashboard with daily curtailment trends, summaries, and context.
- Reads data from the [kardashev-data](https://github.com/kardashev-lab/kardashev-data) API (`data.kardashevlabs.org`). Ingestion does **not** live in this repo.

Stack: Next.js 15, React 19, Tailwind CSS v4, kardashev-charts (D3).

## Local setup

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:3000`. The app reads from the public API by default; set
`KARDASHEV_API_URL` to point at a different instance.

## Before opening a PR

From `web/`:

```bash
npm run build
```

## Good first contributions

- Improve chart labels and units.
- Add a "what changed today" summary card.
- Improve mobile layout for the ISO cards.
- Surface a visible error state when the API is unreachable.

## Data notes

- New ISOs are added upstream in kardashev-data; this dashboard picks them up automatically (add display metadata in `web/app/page.tsx` `ISO_META`).
- Treat missing data differently from zero curtailment.
- Keep dates explicit and timezone-safe.

## PR guidelines

- Keep one UI area per PR when possible.
- Include screenshots for UI changes.
