import pg from "pg";

export type DailyRow = {
  iso: string;
  date: string;        // YYYY-MM-DD
  solar_mwh: number;
  wind_mwh: number;
  total_mwh: number;
};

export type ISOSummary = {
  iso: string;
  latest_date: string;
  solar_mwh_today: number;
  wind_mwh_today: number;
  total_mwh_today: number;
  total_mwh_30d: number;
  solar_mwh_30d: number;
  wind_mwh_30d: number;
  days_with_data: number;
};

let pool: pg.Pool | null = null;

function getPool(): pg.Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
    pool.on("error", (err) => console.error("pg pool error:", err.message));
  }
  return pool;
}

export async function fetchHistory(iso: string, days = 90): Promise<DailyRow[]> {
  const db = getPool();
  if (!db) return [];

  try {
    const { rows } = await db.query<DailyRow>(
      `SELECT iso,
              TO_CHAR(date, 'YYYY-MM-DD') AS date,
              COALESCE(solar_mwh, 0)::float AS solar_mwh,
              COALESCE(wind_mwh, 0)::float  AS wind_mwh,
              COALESCE(total_mwh, 0)::float AS total_mwh
       FROM curtailment_daily
       WHERE iso = $1
         AND date >= CURRENT_DATE - ($2 || ' days')::interval
       ORDER BY date ASC`,
      [iso, days]
    );
    return rows;
  } catch (err) {
    console.error("fetchHistory error:", (err as Error).message);
    return [];
  }
}

export async function fetchSummaries(): Promise<ISOSummary[]> {
  const db = getPool();
  if (!db) return [];

  try {
    const { rows } = await db.query<ISOSummary>(`
      WITH latest AS (
        SELECT DISTINCT ON (iso)
          iso, date,
          solar_mwh AS solar_mwh_today,
          wind_mwh  AS wind_mwh_today,
          total_mwh AS total_mwh_today
        FROM curtailment_daily
        ORDER BY iso, date DESC
      ),
      rolling AS (
        SELECT
          iso,
          COALESCE(SUM(total_mwh), 0)::float AS total_mwh_30d,
          COALESCE(SUM(solar_mwh), 0)::float AS solar_mwh_30d,
          COALESCE(SUM(wind_mwh),  0)::float AS wind_mwh_30d,
          COUNT(*)::int                       AS days_with_data
        FROM curtailment_daily
        WHERE date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY iso
      )
      SELECT
        l.iso,
        TO_CHAR(l.date, 'YYYY-MM-DD')          AS latest_date,
        COALESCE(l.solar_mwh_today, 0)::float  AS solar_mwh_today,
        COALESCE(l.wind_mwh_today,  0)::float  AS wind_mwh_today,
        COALESCE(l.total_mwh_today, 0)::float  AS total_mwh_today,
        COALESCE(r.total_mwh_30d,   0)::float  AS total_mwh_30d,
        COALESCE(r.solar_mwh_30d,   0)::float  AS solar_mwh_30d,
        COALESCE(r.wind_mwh_30d,    0)::float  AS wind_mwh_30d,
        COALESCE(r.days_with_data,  0)::int    AS days_with_data
      FROM latest l
      LEFT JOIN rolling r USING (iso)
      ORDER BY l.iso
    `);
    return rows;
  } catch (err) {
    console.error("fetchSummaries error:", (err as Error).message);
    return [];
  }
}

export async function fetchAvailableISOs(): Promise<string[]> {
  const db = getPool();
  if (!db) return [];

  try {
    const { rows } = await db.query<{ iso: string }>(
      "SELECT DISTINCT iso FROM curtailment_daily ORDER BY iso"
    );
    return rows.map((r) => r.iso);
  } catch (err) {
    console.error("fetchAvailableISOs error:", (err as Error).message);
    return [];
  }
}
