# US Curtailment Tracker

Live at **curtailment.kardashevlabs.org** · Part of [Kardashev Labs](https://kardashevlabs.org)

How much solar and wind energy is being thrown away every day — by ISO.
Curtailment signals where the grid is congested and where battery storage is needed.

## ISOs covered

| ISO | Region | Solar | Wind |
|-----|--------|-------|------|
| CAISO | California | ✓ | ✓ |
| ERCOT | Texas | — | ✓ |

More ISOs coming. PRs welcome.

## Data sources

- **CAISO**: [OASIS ENE_SLRS report](https://oasis.caiso.com) (Statewide Lost Renewable Statistics) via [gridstatus](https://github.com/kmax12/gridstatus)
- **ERCOT**: Market curtailment reports via gridstatus

Data refreshed daily at **08:00 UTC** (midnight PT) via GitHub Actions, after ISOs finalize previous-day data.

## Stack

- **Fetcher**: Python 3.12, gridstatus, psycopg2
- **Database**: PostgreSQL 16
- **Frontend**: Next.js 15, Tailwind CSS v4, Recharts
- **Infra**: Docker Compose (local), GitHub Actions (cron)

## Local development

```bash
# 1. Start Postgres
docker compose up postgres -d

# 2. Seed the database (backfills 90 days)
pip install -r services/fetcher/requirements.txt
DATABASE_URL=postgres://curtailment:curtailment@localhost:5432/curtailment \
BACKFILL_DAYS=90 \
python services/fetcher/fetch.py

# 3. Run the web app
cd web
npm install
DATABASE_URL=postgres://curtailment:curtailment@localhost:5432/curtailment \
npm run dev
```

Open http://localhost:3000.

## GitHub Actions setup

Add one secret to the repo:

| Secret | Value |
|--------|-------|
| `DATABASE_URL` | Postgres connection string for your hosted DB |

The workflow runs daily and also supports manual dispatch with optional `fetch_date` override.

## Schema

```sql
CREATE TABLE curtailment_daily (
    iso        TEXT    NOT NULL,
    date       DATE    NOT NULL,
    solar_mwh  NUMERIC,
    wind_mwh   NUMERIC,
    total_mwh  NUMERIC,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (iso, date)
);
```

## What is curtailment?

Curtailment is when grid operators tell solar or wind generators to produce less than they could — because there's more electricity than the grid can absorb. It's wasted clean energy. High curtailment signals congested transmission, insufficient storage, or a mismatch between when generation peaks and when demand peaks (the duck curve problem).

CAISO leads the US in solar curtailment. In 2023, California curtailed over 2.4 million MWh of solar — enough to power ~400,000 homes for a year.

## License

MIT · [github.com/kardashev-lab](https://github.com/kardashev-lab)
