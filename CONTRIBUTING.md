# Contributing to Curtailment Tracker

Thanks for helping track wasted renewable energy. This project turns public ISO curtailment data into a simple daily view of where solar and wind generation is being reduced.

## What this repo does

- Fetches daily curtailment data for CAISO, ERCOT, and SPP where available.
- Stores daily ISO-level values in Postgres.
- Serves a Next.js dashboard with trends, summaries, and context.

Stack: Python fetcher, Postgres, Next.js 15, React 19, Tailwind CSS v4, Recharts, Docker Compose, GitHub Actions.

## Local setup

```bash
docker compose up postgres -d

pip install -r services/fetcher/requirements.txt
DATABASE_URL=postgres://curtailment:curtailment@localhost:5432/curtailment \
BACKFILL_DAYS=90 \
python services/fetcher/fetch.py

cd web
npm install
DATABASE_URL=postgres://curtailment:curtailment@localhost:5432/curtailment npm run dev
```

Open `http://localhost:3000`.

## Before opening a PR

From `web/`:

```bash
npm run build
```

If you change the fetcher, run it locally for the affected ISO and include the date range tested.

## Good first contributions

- Add SPP documentation and coverage notes.
- Improve chart labels and units.
- Add a "what changed today" summary card.
- Improve mobile layout for the ISO cards.
- Add tests or validation for duplicate daily rows.

## Data contribution guidelines

- Treat missing data differently from zero curtailment.
- Keep dates explicit and timezone-safe.
- Document source quirks in the README.
- Do not commit database dumps or secrets.

## PR guidelines

- Keep one source or UI area per PR when possible.
- Include screenshots for UI changes.
- Mention which ISO and dates you tested.
