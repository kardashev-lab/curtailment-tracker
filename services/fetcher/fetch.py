#!/usr/bin/env python3
"""Fetch US ISO curtailment data and upsert into Postgres.

Runs daily (via GitHub Actions cron). On first run, backfills BACKFILL_DAYS.
Source: gridstatus library (wraps CAISO daily renewables HTML report).
Note: CAISO report is published with a 1-day lag; gridstatus covers ~30 days back.
"""

from __future__ import annotations

import os
import sys
import time
import traceback
from datetime import date, timedelta
from typing import TypedDict

import pandas as pd
import psycopg2
import psycopg2.extras

DATABASE_URL = os.environ["DATABASE_URL"]
BACKFILL_DAYS = int(os.environ.get("BACKFILL_DAYS", "30"))
# If FETCH_DATE is set (YYYY-MM-DD), fetch only that date.
FETCH_DATE = os.environ.get("FETCH_DATE")


class CurtailmentRow(TypedDict):
    iso: str
    date: date
    solar_mwh: float
    wind_mwh: float
    total_mwh: float


# ---------------------------------------------------------------------------
# CAISO — primary via gridstatus, fallback to OASIS direct
# ---------------------------------------------------------------------------

def _caiso_via_gridstatus(target: date) -> CurtailmentRow | None:
    try:
        import gridstatus

        caiso = gridstatus.CAISO()
        df = caiso.get_curtailment(target.isoformat())

        if df is None or df.empty:
            return None

        df.columns = [str(c).strip() for c in df.columns]

        # Actual gridstatus schema: Fuel Type + Curtailment MWH (already in MWh, no conversion needed)
        if "Fuel Type" not in df.columns or "Curtailment MWH" not in df.columns:
            print(f"[CAISO/gridstatus] Unexpected columns: {list(df.columns)[:8]}")
            return None

        df["Curtailment MWH"] = pd.to_numeric(df["Curtailment MWH"], errors="coerce").fillna(0)
        solar_mwh = float(df[df["Fuel Type"] == "Solar"]["Curtailment MWH"].sum())
        wind_mwh  = float(df[df["Fuel Type"] == "Wind"]["Curtailment MWH"].sum())

        return CurtailmentRow(
            iso="CAISO",
            date=target,
            solar_mwh=round(solar_mwh, 2),
            wind_mwh=round(wind_mwh, 2),
            total_mwh=round(solar_mwh + wind_mwh, 2),
        )
    except Exception as exc:
        print(f"[CAISO/gridstatus] failed: {exc}")
        return None


def fetch_caiso(target: date) -> CurtailmentRow | None:
    return _caiso_via_gridstatus(target)


# ERCOT curtailment is not available via gridstatus as of this writing.
# Placeholder — add implementation when a reliable source is found.


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

SCHEMA = """
CREATE TABLE IF NOT EXISTS curtailment_daily (
    iso         TEXT    NOT NULL,
    date        DATE    NOT NULL,
    solar_mwh   NUMERIC,
    wind_mwh    NUMERIC,
    total_mwh   NUMERIC,
    fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (iso, date)
);

CREATE INDEX IF NOT EXISTS curtailment_daily_date_idx ON curtailment_daily (date DESC);
"""

UPSERT = """
INSERT INTO curtailment_daily (iso, date, solar_mwh, wind_mwh, total_mwh, fetched_at)
VALUES (%(iso)s, %(date)s, %(solar_mwh)s, %(wind_mwh)s, %(total_mwh)s, NOW())
ON CONFLICT (iso, date) DO UPDATE SET
    solar_mwh  = EXCLUDED.solar_mwh,
    wind_mwh   = EXCLUDED.wind_mwh,
    total_mwh  = EXCLUDED.total_mwh,
    fetched_at = NOW();
"""


def upsert(conn, row: CurtailmentRow) -> None:
    with conn.cursor() as cur:
        cur.execute(UPSERT, row)
    conn.commit()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

FETCHERS = {
    "CAISO": fetch_caiso,
    # "ERCOT": fetch_ercot,  # not yet available via gridstatus
}


def dates_to_fetch() -> list[date]:
    if FETCH_DATE:
        return [date.fromisoformat(FETCH_DATE)]

    today = date.today()
    yesterday = today - timedelta(days=1)

    return [yesterday - timedelta(days=i) for i in range(BACKFILL_DAYS)]


def already_fetched(conn, iso: str, target: date) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM curtailment_daily WHERE iso = %s AND date = %s",
            (iso, target),
        )
        return cur.fetchone() is not None


def main() -> None:
    conn = psycopg2.connect(DATABASE_URL)

    with conn.cursor() as cur:
        cur.execute(SCHEMA)
    conn.commit()

    targets = dates_to_fetch()
    print(f"Fetching curtailment for {len(targets)} date(s): {targets[0]} → {targets[-1]}")

    errors = 0
    for iso, fetcher in FETCHERS.items():
        for target in targets:
            if already_fetched(conn, iso, target):
                print(f"[{iso}] {target} already in DB, skipping")
                continue

            print(f"[{iso}] fetching {target}…")
            try:
                row = fetcher(target)
                if row is None:
                    print(f"[{iso}] {target} → no data returned")
                    continue
                upsert(conn, row)
                print(f"[{iso}] {target} → solar={row['solar_mwh']} MWh  wind={row['wind_mwh']} MWh  total={row['total_mwh']} MWh")
            except Exception:
                traceback.print_exc()
                errors += 1

            time.sleep(1)  # polite rate limiting

    conn.close()

    if errors:
        print(f"\n{errors} error(s) during fetch", file=sys.stderr)
        sys.exit(1)

    print("\nDone.")


if __name__ == "__main__":
    main()
