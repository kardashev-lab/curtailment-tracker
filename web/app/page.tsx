import { fetchHistory, fetchSummaries } from "@/lib/db";
import CurtailmentChart from "@/components/CurtailmentChart";

export const revalidate = 3600; // ISR — rebuild page every hour

const ISO_META: Record<string, { label: string; color: string; dot: string; badge: string; region: string }> = {
  CAISO: {
    label: "CAISO",
    color: "#f59e0b",
    dot: "bg-amber-400",
    badge: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
    region: "California",
  },
  ERCOT: {
    label: "ERCOT",
    color: "#60a5fa",
    dot: "bg-blue-400",
    badge: "bg-blue-500/10 text-blue-400 ring-blue-500/20",
    region: "Texas",
  },
};

function fmtGwh(mwh: number) {
  const gwh = mwh / 1000;
  return gwh >= 1 ? `${gwh.toFixed(1)} GWh` : `${Math.round(mwh)} MWh`;
}

function fmtDate(dateStr: string) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function HomePage() {
  const [summaries, caisoHistory, ercotHistory] = await Promise.all([
    fetchSummaries(),
    fetchHistory("CAISO", 90),
    fetchHistory("ERCOT", 90),
  ]);

  const historyByISO: Record<string, typeof caisoHistory> = {
    CAISO: caisoHistory,
    ERCOT: ercotHistory,
  };

  const totalSolar30d = summaries.reduce((a, s) => a + s.solar_mwh_30d, 0);
  const totalWind30d = summaries.reduce((a, s) => a + s.wind_mwh_30d, 0);
  const totalAll30d = summaries.reduce((a, s) => a + s.total_mwh_30d, 0);

  const hasData = summaries.length > 0;

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      {/* Nav */}
      <header className="border-b border-white/[0.06] px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="https://kardashevlabs.org" className="text-sm font-semibold text-white tracking-tight">
            Kardashev<span className="text-amber-400">Labs</span>
          </a>
          <nav className="flex items-center gap-4 text-xs text-white/40">
            <a href="https://interconnection-queue.kardashevlabs.org" className="hover:text-white/70 transition-colors">Queue Tracker</a>
            <a href="https://grid-demand.kardashevlabs.org" className="hover:text-white/70 transition-colors">Grid Demand</a>
            <a href="https://github.com/kardashev-lab" target="_blank" rel="noopener noreferrer" className="hover:text-white/70 transition-colors">GitHub</a>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12 lg:py-20">
        {/* Hero */}
        <div className="mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] uppercase tracking-[0.18em] font-medium bg-white/5 ring-1 ring-white/10 text-white/40 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Daily refresh · Open source
          </span>
          <h1 className="text-3xl lg:text-5xl font-bold tracking-tight leading-[1.08] mb-4">
            US Curtailment Tracker
          </h1>
          <p className="text-white/40 text-[1rem] max-w-xl leading-relaxed">
            How much solar and wind energy is being thrown away every day — by ISO.
            Curtailment signals where the grid is congested and where storage is needed.
          </p>
        </div>

        {/* 30-day aggregate stats */}
        {hasData && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
            {[
              { label: "Solar curtailed (30d)", value: fmtGwh(totalSolar30d), color: "text-amber-400" },
              { label: "Wind curtailed (30d)",  value: fmtGwh(totalWind30d),  color: "text-blue-400" },
              { label: "Total curtailed (30d)", value: fmtGwh(totalAll30d),   color: "text-white" },
              { label: "ISOs tracked",          value: summaries.length.toString(), color: "text-emerald-400" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-px rounded-2xl bg-gradient-to-br from-white/8 to-white/[0.02]"
              >
                <div className="rounded-[calc(1rem-1px)] bg-white/[0.02] p-4 lg:p-5">
                  <div className={`font-mono text-2xl font-semibold mb-1 ${stat.color}`}>
                    {stat.value}
                  </div>
                  <div className="text-[11px] text-white/30 uppercase tracking-wider">
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ISO cards */}
        {hasData ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {summaries.map((s) => {
              const meta = ISO_META[s.iso] ?? {
                label: s.iso,
                color: "#94a3b8",
                dot: "bg-slate-400",
                badge: "bg-slate-500/10 text-slate-400 ring-slate-500/20",
                region: "",
              };
              const history = historyByISO[s.iso] ?? [];

              return (
                <div
                  key={s.iso}
                  className="p-px rounded-[2rem] bg-gradient-to-br from-white/10 via-white/5 to-white/[0.02]"
                >
                  <div className="h-full rounded-[calc(2rem-1px)] bg-white/[0.025] p-6 lg:p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] uppercase tracking-[0.15em] font-medium ring-1 ${meta.badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} animate-pulse`} />
                          {meta.label}
                        </span>
                        {meta.region && (
                          <span className="text-[11px] text-white/25 font-mono">{meta.region}</span>
                        )}
                      </div>
                      <span className="text-[11px] text-white/20 font-mono">
                        {fmtDate(s.latest_date)}
                      </span>
                    </div>

                    {/* Latest day stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-white/[0.06]">
                      <div>
                        <div className="text-amber-400 font-mono text-lg font-semibold">
                          {fmtGwh(s.solar_mwh_today)}
                        </div>
                        <div className="text-[11px] text-white/30 uppercase tracking-wider mt-0.5">
                          Solar
                        </div>
                      </div>
                      <div>
                        <div className="text-blue-400 font-mono text-lg font-semibold">
                          {fmtGwh(s.wind_mwh_today)}
                        </div>
                        <div className="text-[11px] text-white/30 uppercase tracking-wider mt-0.5">
                          Wind
                        </div>
                      </div>
                      <div>
                        <div className="text-white font-mono text-lg font-semibold">
                          {fmtGwh(s.total_mwh_today)}
                        </div>
                        <div className="text-[11px] text-white/30 uppercase tracking-wider mt-0.5">
                          Total
                        </div>
                      </div>
                    </div>

                    {/* 30d summary */}
                    <div className="mb-6">
                      <div className="text-[11px] text-white/25 uppercase tracking-widest mb-3">
                        Last 30 days
                      </div>
                      <div className="flex gap-6">
                        <div>
                          <span className="text-sm font-mono text-white/60">{fmtGwh(s.solar_mwh_30d)}</span>
                          <span className="text-[11px] text-white/25 ml-1.5">solar</span>
                        </div>
                        <div>
                          <span className="text-sm font-mono text-white/60">{fmtGwh(s.wind_mwh_30d)}</span>
                          <span className="text-[11px] text-white/25 ml-1.5">wind</span>
                        </div>
                      </div>
                    </div>

                    {/* Chart */}
                    <div className="mb-4">
                      <div className="text-[11px] text-white/25 uppercase tracking-widest mb-3 flex items-center gap-4">
                        <span>90-day trend</span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-px bg-amber-400" />
                          <span>Solar</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-px bg-blue-400" />
                          <span>Wind</span>
                        </span>
                      </div>
                      <CurtailmentChart data={history} iso={s.iso} />
                    </div>

                    {/* Source */}
                    <div className="text-[11px] text-white/18 font-mono">
                      Source:{" "}
                      {s.iso === "CAISO"
                        ? "CAISO OASIS ENE_SLRS · gridstatus"
                        : `${s.iso} market reports · gridstatus`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty state — before first fetch runs */
          <div className="p-px rounded-[2rem] bg-gradient-to-br from-white/10 via-white/5 to-white/[0.02]">
            <div className="rounded-[calc(2rem-1px)] bg-white/[0.025] p-10 lg:p-16 text-center">
              <div className="text-white/20 text-sm mb-2">No data yet</div>
              <p className="text-white/30 text-xs max-w-sm mx-auto">
                The fetcher runs daily at 08:00 UTC. Run{" "}
                <code className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-white/50">
                  python services/fetcher/fetch.py
                </code>{" "}
                locally with <code className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-white/50">DATABASE_URL</code> set to seed the database.
              </p>
            </div>
          </div>
        )}

        {/* Explainer */}
        <div className="mt-10 p-px rounded-2xl bg-gradient-to-br from-white/8 to-white/[0.02]">
          <div className="rounded-[calc(1rem-1px)] bg-white/[0.01] p-6 lg:p-8">
            <h2 className="text-sm font-semibold text-white mb-3">What is curtailment?</h2>
            <p className="text-[0.82rem] text-white/35 leading-relaxed max-w-3xl">
              Curtailment is when grid operators instruct solar or wind generators to produce less
              power than they could — usually because there&apos;s more electricity than the grid can
              absorb at that moment. It&apos;s wasted clean energy. High curtailment signals congested
              transmission, insufficient storage, or poor timing between generation and demand.
              CAISO (California) consistently leads the US in solar curtailment — the &ldquo;duck
              curve&rdquo; problem made visible.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-4 py-8 mt-16">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-white/18 font-mono">
            © {new Date().getFullYear()} Kardashev Labs · Open source ·{" "}
            <a
              href="https://github.com/kardashev-lab"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/40 transition-colors"
            >
              github.com/kardashev-lab
            </a>
          </p>
          <p className="text-[12px] text-white/18 font-mono">curtailment.kardashevlabs.org</p>
        </div>
      </footer>
    </div>
  );
}
