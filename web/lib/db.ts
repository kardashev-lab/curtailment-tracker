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

async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch (err) {
    console.error("kardashev API error:", (err as Error).message);
    return null;
  }
}

export async function fetchHistory(iso: string, days = 90): Promise<DailyRow[]> {
  const data = await apiFetch<DailyRow[]>(`/curtailment?iso=${iso}&days=${days}`);
  if (!data) return [];
  return [...data].sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchSummaries(): Promise<ISOSummary[]> {
  const [summary, history] = await Promise.all([
    apiFetch<Array<{
      iso: string;
      latest_date: string;
      solar_30d_mwh: number;
      wind_30d_mwh: number;
      total_30d_mwh: number;
    }>>("/curtailment/summary"),
    apiFetch<DailyRow[]>("/curtailment?days=90"),
  ]);

  if (!summary) return [];
  const allRows = history ?? [];

  return summary.map((s) => {
    const isoRows = allRows.filter((r) => r.iso === s.iso);
    const latest =
      isoRows.find((r) => r.date === s.latest_date) ??
      isoRows.reduce<DailyRow | null>(
        (best, r) => (!best || r.date > best.date ? r : best),
        null,
      );
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
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
}

export async function fetchAvailableISOs(): Promise<string[]> {
  const data = await apiFetch<Array<{ iso: string }>>("/curtailment/summary");
  if (!data) return [];
  return data.map((r) => r.iso);
}
