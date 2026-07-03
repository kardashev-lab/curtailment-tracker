# US Curtailment Tracker

Live at **[curtailment-tracker.kardashevlabs.org](https://curtailment-tracker.kardashevlabs.org)** · Part of [Kardashev Labs](https://kardashevlabs.org)

How much solar and wind energy is being thrown away every day, by ISO.
Curtailment signals where the grid is congested and where battery storage is needed.

## Architecture

This repo is the **frontend only**. Data ingestion lives in
[kardashev-data](https://github.com/kardashev-lab/kardashev-data), which fetches daily
curtailment numbers from each ISO and serves them via a public API.

```
ISO reports → kardashev-data (ingest + Postgres + API)
                     ↓
        data.kardashevlabs.org/curtailment
                     ↓
        Next.js dashboard (this repo)
```

The dashboard server-renders on every request and pulls everything it needs in two API
calls: `/curtailment/summary` and `/curtailment?days=90`.

## ISOs covered

| ISO | Region | Solar | Wind |
|-----|--------|-------|------|
| CAISO | California | ✓ | ✓ |
| SPP | Southwest Power Pool | — | ✓ |
| ERCOT | Texas | — | ✓ |

More ISOs coming. PRs welcome. New ISOs added upstream in kardashev-data show up here
automatically.

## Data sources

- **CAISO**: [OASIS ENE_SLRS report](https://oasis.caiso.com) (Statewide Lost Renewable Statistics)
- **SPP**: Wind curtailment derived from SPP market reports
- **ERCOT**: Market curtailment reports

All fetched daily by kardashev-data after ISOs finalize previous-day data.

## Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS v4, Recharts
- **Data**: [kardashev-data](https://github.com/kardashev-lab/kardashev-data) API
- **Infra**: Docker (standalone Next.js image)

## Local development

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000. By default the app reads from the public API at
`data.kardashevlabs.org`; point it elsewhere with:

| Variable | Default | Purpose |
|----------|---------|---------|
| `KARDASHEV_API_URL` | `https://data.kardashevlabs.org` | Base URL of the kardashev-data API |

Or run the containerized build:

```bash
docker compose up --build
```

## What is curtailment?

Curtailment is when grid operators tell solar or wind generators to produce less than they could, because there's more electricity than the grid can absorb. It's wasted clean energy. High curtailment signals congested transmission, insufficient storage, or a mismatch between when generation peaks and when demand peaks (the duck curve problem).

CAISO leads the US in solar curtailment. In 2023, California curtailed over 2.4 million MWh of solar, enough to power ~400,000 homes for a year. SPP leads in wind curtailment across the Great Plains.

## License

MIT · [github.com/kardashev-lab](https://github.com/kardashev-lab)
