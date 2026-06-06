#!/usr/bin/env python3
"""Fetch US ISO curtailment data and upsert into Postgres.

Runs daily (via GitHub Actions cron). On first run, backfills BACKFILL_DAYS.
Primary source: gridstatus library. CAISO fallback: OASIS API directly.
"""

from __future__ import annotations

import io
import os
import sys
import time
import traceback
import zipfile
from datetime import date, timedelta
from typing import TypedDict

import pandas as pd
import psycopg2
import psycopg2.extras
import requests

DATABASE_URL = os.environ["DATABASE_URL"]
BACKFILL_DAYS = int(os.environ.get("BACKFILL_DAYS", "90"))
# If FETCH_DATE is set (YYYY-MM-DD), fetch only that date. Used for backfill reruns.
FETCH_DATE = os.environ.get("FETCH_DATE")

CAISO_OASIS_URL = "https://oasis.caiso.com/oasisapi/SingleZip"


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

        # gridstatus returns columns like "Solar Curtailment (MW)" / "Wind Curtailment (MW)"
        # or a "Curtailment Type" + "Curtailment MW" format depending on version
        solar_mwh = 0.0
        wind_mwh = 0.0

        if "Solar Curtailment (MW)" in df.columns:
            # wide format — each row is a 5-min or hourly interval
            df["Solar Curtailment (MW)"] = pd.to_numeric(df["Solar Curtailment (MW)"], errors="coerce").fillna(0)
            df["Wind Curtailment (MW)"] = pd.to_numeric(df.get("Wind Curtailment (MW)", 0), errors="coerce").fillna(0)
            # determine interval size from number of rows (288 = 5-min, 24 = hourly)
            hours = len(df) / 288 if len(df) >= 288 else len(df) / 24
            solar_mwh = float(df["Solar Curtailment (MW)"].sum() * (1 / 12 if len(df) >= 200 else 1))
            wind_mwh = float(df["Wind Curtailment (MW)"].sum() * (1 / 12 if len(df) >= 200 else 1))
        elif "Curtailment Type" in df.columns and "Curtailment MW" in df.columns:
            df["Curtailment MW"] = pd.to_numeric(df["Curtailment MW"], errors="coerce").fillna(0)
            df["mwh"] = df["Curtailment MW"] / 12
            solar_mwh = float(df[df["Curtailment Type"].str.contains("Solar", case=False, na=False)]["mwh"].sum())
            wind_mwh = float(df[df["Curtailment Type"].str.contains("Wind", case=False, na=False)]["mwh"].sum())
        else:
            print(f"[CAISO/gridstatus] Unknown columns: {list(df.columns)[:8]}")
            return None

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


def _caiso_via_oasis(target: date) -> CurtailmentRow | None:
    """Direct CAISO OASIS API call — ENE_SLRS report (Statewide Lost Renewable Statistics)."""
    start = f"{target.strftime('%Y%m%d')}T00:00-0000"
    end = f"{target.strftime('%Y%m%d')}T23:59-0000"

    params = {
        "queryname": "ENE_SLRS",
        "startdatetime": start,
        "enddatetime": end,
        "version": "1",
        "resultformat": "6",  # CSV in ZIP
    }

    try:
        resp = requests.get(CAISO_OASIS_URL, params=params, timeout=60)
        resp.raise_for_status()

        with zipfile.ZipFile(io.BytesIO(resp.content)) as z:
            csv_name = next(n for n in z.namelist() if n.endswith(".csv"))
            with z.open(csv_name) as f:
                df = pd.read_csv(f)

        df.columns = [c.strip().upper() for c in df.columns]

        if "CURTAILMENT_TYPE" not in df.columns or "CURTAILMENT_MW" not in df.columns:
            print(f"[CAISO/OASIS] unexpected columns: {list(df.columns)}")
            return None

        df["CURTAILMENT_MW"] = pd.to_numeric(df["CURTAILMENT_MW"], errors="coerce").fillna(0)
        df["mwh"] = df["CURTAILMENT_MW"] / 12  # 5-min intervals

        solar_mwh = float(df[df["CURTAILMENT_TYPE"].str.upper().str.contains("SOLAR", na=False)]["mwh"].sum())
        wind_mwh = float(df[df["CURTAILMENT_TYPE"].str.upper().str.contains("WIND", na=False)]["mwh"].sum())

        return CurtailmentRow(
            iso="CAISO",
            date=target,
            solar_mwh=round(solar_mwh, 2),
            wind_mwh=round(wind_mwh, 2),
            total_mwh=round(solar_mwh + wind_mwh, 2),
        )
    except Exception as exc:
        print(f"[CAISO/OASIS] failed: {exc}")
        return None


def fetch_caiso(target: date) -> CurtailmentRow | None:
    row = _caiso_via_gridstatus(target)
    if row is not None:
        return row
    print("[CAISO] gridstatus failed, falling back to OASIS API")
    return _caiso_via_oasis(target)


# ---------------------------------------------------------------------------
# ERCOT — wind curtailment via gridstatus
# ---------------------------------------------------------------------------

def fetch_ercot(target: date) -> CurtailmentRow | None:
    try:
        import gridstatus

        ercot = gridstatus.Ercot()

        # gridstatus may expose get_wind_curtailment or similar
        df = None
        for method_name in ("get_wind_curtailment", "get_curtailment"):
            method = getattr(ercot, method_name, None)
            if method:
                df = method(target.isoformat())
                break

        if df is None or df.empty:
            return None

        df.columns = [str(c).strip() for c in df.columns]

        # identify wind MW column
        wind_col = next(
            (c for c in df.columns if "wind" in c.lower() and "mw" in c.lower()),
            None,
        )
        if not wind_col:
            return None

        df[wind_col] = pd.to_numeric(df[wind_col], errors="coerce").fillna(0)
        rows_per_hour = len(df) / 24 if len(df) >= 24 else 1
        wind_mwh = float(df[wind_col].sum() / rows_per_hour)

        return CurtailmentRow(
            iso="ERCOT",
            date=target,
            solar_mwh=0.0,
            wind_mwh=round(wind_mwh, 2),
            total_mwh=round(wind_mwh, 2),
        )
    except Exception as exc:
        print(f"[ERCOT] failed: {exc}")
        return None


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
    "ERCOT": fetch_ercot,
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
