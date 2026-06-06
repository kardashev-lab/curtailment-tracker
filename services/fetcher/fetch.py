#!/usr/bin/env python3
"""Fetch US ISO curtailment data and upsert into Postgres.

ISOs covered:
  CAISO — California (solar + wind via gridstatus daily HTML report, ~30-day window)
  SPP   — Southwest Power Pool (wind + solar VER curtailments, full CSV archive)
  ERCOT — Texas (solar + wind estimated from PVGRPP/WGRPP vs actual generation)

Runs daily via GitHub Actions cron. On first run, backfills BACKFILL_DAYS.
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

DATABASE_URL  = os.environ["DATABASE_URL"]
BACKFILL_DAYS = int(os.environ.get("BACKFILL_DAYS", "30"))
FETCH_DATE    = os.environ.get("FETCH_DATE")  # YYYY-MM-DD — fetch only this date


class CurtailmentRow(TypedDict):
    iso: str
    date: date
    solar_mwh: float
    wind_mwh: float
    total_mwh: float


# ---------------------------------------------------------------------------
# CAISO — gridstatus scrapes daily HTML renewables report (1-day lag, ~30 days)
# ---------------------------------------------------------------------------

def fetch_caiso(target: date) -> CurtailmentRow | None:
    try:
        import gridstatus

        caiso = gridstatus.CAISO()
        df = caiso.get_curtailment(target.isoformat())

        if df is None or df.empty:
            return None

        df.columns = [str(c).strip() for c in df.columns]

        if "Fuel Type" not in df.columns or "Curtailment MWH" not in df.columns:
            print(f"[CAISO] Unexpected columns: {list(df.columns)[:8]}")
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
        print(f"[CAISO] failed: {exc}")
        return None


# ---------------------------------------------------------------------------
# SPP — Southwest Power Pool VER curtailment CSV archive
#   288 five-minute intervals/day in MW → sum × (5/60) = daily MWh
#   Wind columns: Redispatch + Manual + Curtailed For Energy
#   Solar columns: same three categories
# ---------------------------------------------------------------------------

_SPP_WIND_COLS  = [
    "Wind Redispatch Curtailments",
    "Wind Manual Curtailments",
    "Wind Curtailed For Energy",
]
_SPP_SOLAR_COLS = [
    "Solar Redispatch Curtailments",
    "Solar Manual Curtailments",
    "Solar Curtailed For Energy",
]
_SPP_INTERVAL_H = 5 / 60  # each row = 5-minute average in MW


def fetch_spp(target: date) -> CurtailmentRow | None:
    try:
        import gridstatus

        spp = gridstatus.SPP()
        df  = spp.get_ver_curtailments(target.isoformat())

        if df is None or df.empty:
            return None

        for col in _SPP_WIND_COLS + _SPP_SOLAR_COLS:
            if col not in df.columns:
                print(f"[SPP] Missing column '{col}' — columns: {list(df.columns)}")
                return None
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

        wind_mwh  = float(df[_SPP_WIND_COLS].sum().sum()  * _SPP_INTERVAL_H)
        solar_mwh = float(df[_SPP_SOLAR_COLS].sum().sum() * _SPP_INTERVAL_H)

        return CurtailmentRow(
            iso="SPP",
            date=target,
            solar_mwh=round(solar_mwh, 2),
            wind_mwh=round(wind_mwh, 2),
            total_mwh=round(solar_mwh + wind_mwh, 2),
        )
    except Exception as exc:
        print(f"[SPP] failed: {exc}")
        return None


# ---------------------------------------------------------------------------
# ERCOT — Texas
#   Curtailment estimated as max(0, resource_potential − actual_generation).
#   Wind: WGRPP (Wind Generation Resource Production Potential) vs GEN SYSTEM WIDE
#   Solar: PVGRPP (PV Generation Resource Production Potential) vs GEN SYSTEM WIDE
#   ERCOT publishes hourly reports with a ~2-day lag, so we try offset +2..+5.
# ---------------------------------------------------------------------------

import pytz as _pytz

_ERCOT_CT = _pytz.timezone("US/Central")


def _ercot_day_curtailment(fetch_fn, target: date, gen_col: str, potential_col: str) -> float:
    for offset in range(2, 6):
        try:
            fetch_date = (target + timedelta(days=offset)).isoformat()
            df = fetch_fn(fetch_date)
            if df is None or df.empty:
                continue
            df = df.copy()
            df["_date"] = df["Interval Start"].dt.tz_convert(_ERCOT_CT).dt.date
            df = df[df["_date"] == target]
            if df.empty:
                continue
            # Keep latest publish-time version of each interval (multiple documents overlap)
            df = df.sort_values("Publish Time").groupby("Interval Start", as_index=False).last()
            df[gen_col]       = pd.to_numeric(df[gen_col],       errors="coerce").fillna(0)
            df[potential_col] = pd.to_numeric(df[potential_col], errors="coerce").fillna(0)
            return float((df[potential_col] - df[gen_col]).clip(lower=0).sum())
        except Exception:
            continue
    return 0.0


def fetch_ercot(target: date) -> CurtailmentRow | None:
    try:
        import gridstatus

        ercot = gridstatus.Ercot()
        wind_mwh  = _ercot_day_curtailment(
            ercot.get_wind_actual_and_forecast_hourly,
            target, "GEN SYSTEM WIDE", "WGRPP SYSTEM WIDE",
        )
        solar_mwh = _ercot_day_curtailment(
            ercot.get_solar_actual_and_forecast_hourly,
            target, "GEN SYSTEM WIDE", "PVGRPP SYSTEM WIDE",
        )

        if wind_mwh == 0 and solar_mwh == 0:
            return None

        return CurtailmentRow(
            iso="ERCOT",
            date=target,
            solar_mwh=round(solar_mwh, 2),
            wind_mwh=round(wind_mwh, 2),
            total_mwh=round(solar_mwh + wind_mwh, 2),
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
    "CAISO":  fetch_caiso,
    "SPP":    fetch_spp,
    "ERCOT":  fetch_ercot,
    # MISO / PJM / NYISO / ISONE: no curtailment methods in gridstatus
}


def dates_to_fetch() -> list[date]:
    if FETCH_DATE:
        return [date.fromisoformat(FETCH_DATE)]
    today     = date.today()
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
    print(f"ISOs: {list(FETCHERS.keys())}")

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
                print(
                    f"[{iso}] {target} → "
                    f"solar={row['solar_mwh']:,.0f} MWh  "
                    f"wind={row['wind_mwh']:,.0f} MWh  "
                    f"total={row['total_mwh']:,.0f} MWh"
                )
            except Exception:
                traceback.print_exc()
                errors += 1

            time.sleep(1.5)  # polite rate limiting

    conn.close()

    if errors:
        print(f"\n{errors} error(s) during fetch", file=sys.stderr)
        sys.exit(1)

    print("\nDone.")


if __name__ == "__main__":
    main()
