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
}

export async function fetchSummaries(): Promise<ISOSummary[]> {
  const db = getPool();
  if (!db) return [];

  const { rows } = await db.query<ISOSummary>(`
    SELECT
      iso,
      TO_CHAR(MAX(date), 'YYYY-MM-DD')                                         AS latest_date,
      COALESCE(MAX(CASE WHEN date = MAX(date) OVER (PARTITION BY iso) THEN solar_mwh END), 0)::float AS solar_mwh_today,
      COALESCE(MAX(CASE WHEN date = MAX(date) OVER (PARTITION BY iso) THEN wind_mwh  END), 0)::float AS wind_mwh_today,
      COALESCE(MAX(CASE WHEN date = MAX(date) OVER (PARTITION BY iso) THEN total_mwh END), 0)::float AS total_mwh_today,
      COALESCE(SUM(CASE WHEN date >= CURRENT_DATE - INTERVAL '30 days' THEN total_mwh END), 0)::float AS total_mwh_30d,
      COALESCE(SUM(CASE WHEN date >= CURRENT_DATE - INTERVAL '30 days' THEN solar_mwh END), 0)::float AS solar_mwh_30d,
      COALESCE(SUM(CASE WHEN date >= CURRENT_DATE - INTERVAL '30 days' THEN wind_mwh  END), 0)::float AS wind_mwh_30d,
      COUNT(CASE WHEN date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END)::int                     AS days_with_data
    FROM curtailment_daily
    GROUP BY iso
    ORDER BY iso
  `);
  return rows;
}

export async function fetchAvailableISOs(): Promise<string[]> {
  const db = getPool();
  if (!db) return [];

  const { rows } = await db.query<{ iso: string }>(
    "SELECT DISTINCT iso FROM curtailment_daily ORDER BY iso"
  );
  return rows.map((r) => r.iso);
}
