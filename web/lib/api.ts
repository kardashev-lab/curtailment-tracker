const API_BASE = process.env.KARDASHEV_API_URL ?? "https://data.kardashevlabs.org";

export type DailyRow = {
  iso: string;
  date: string;
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

export type DashboardData = {
  summaries: ISOSummary[];
  historyByIso: Record<string, DailyRow[]>;
};

type SummaryRow = {
  iso: string;
  latest_date: string;
  solar_30d_mwh: number;
  wind_30d_mwh: number;
  total_30d_mwh: number;
};

async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
    if (!res.ok) {
      console.error(`kardashev API error: ${path} returned ${res.status}`);
      return null;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    console.error("kardashev API error:", (err as Error).message);
    return null;
  }
}

/**
 * Fetches everything the dashboard needs in two API calls:
 * the per-ISO 30-day summary and the full multi-ISO daily history.
 */
export async function fetchDashboardData(days = 90): Promise<DashboardData> {
  const [summary, history] = await Promise.all([
    apiFetch<SummaryRow[]>("/curtailment/summary"),
    apiFetch<DailyRow[]>(`/curtailment?days=${days}`),
  ]);

  const allRows = history ?? [];

  const historyByIso: Record<string, DailyRow[]> = {};
  for (const row of allRows) {
    (historyByIso[row.iso] ??= []).push(row);
  }
  for (const rows of Object.values(historyByIso)) {
    rows.sort((a, b) => a.date.localeCompare(b.date));
  }

  if (!summary) return { summaries: [], historyByIso };

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const summaries = summary.map((s) => {
    const isoRows = historyByIso[s.iso] ?? [];
    const latest =
      isoRows.find((r) => r.date === s.latest_date) ??
      (isoRows.length > 0 ? isoRows[isoRows.length - 1] : null);
    const daysWithData = isoRows.filter((r) => new Date(r.date) >= cutoff).length;

    return {
      iso: s.iso,
      latest_date: s.latest_date,
      solar_mwh_today: latest?.solar_mwh ?? 0,
      wind_mwh_today: latest?.wind_mwh ?? 0,
      total_mwh_today: latest?.total_mwh ?? 0,
      total_mwh_30d: s.total_30d_mwh ?? 0,
      solar_mwh_30d: s.solar_30d_mwh ?? 0,
      wind_mwh_30d: s.wind_30d_mwh ?? 0,
      days_with_data: daysWithData,
    };
  });

  return { summaries, historyByIso };
}
