import Image from "next/image";
import { fetchDashboardData } from "@/lib/api";
import CurtailmentChart from "@/components/CurtailmentChart";
import CurtailmentHero from "@/components/CurtailmentHero";
import FadeUp from "@/components/FadeUp";

// Daily data: always fetch fresh from kardashev-data (no ISR cache)
export const dynamic = "force-dynamic";

function fmtGwh(mwh: number) {
  const gwh = mwh / 1000;
  return gwh >= 1 ? `${gwh.toFixed(1)} GWh` : `${Math.round(mwh)} MWh`;
}

function fmtDate(dateStr: string) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

const MONO = "var(--font-jetbrains-mono, monospace)";

const ISO_META: Record<string, {
  label: string;
  region: string;
  accent: string;
  accentRgb: string;
  source: string;
}> = {
  CAISO: {
    label: "CAISO", region: "California",
    accent: "#fb7185", accentRgb: "251,113,133",
    source: "CAISO · kardashev-data",
  },
  SPP: {
    label: "SPP", region: "Southwest Power Pool",
    accent: "#34d399", accentRgb: "52,211,153",
    source: "SPP · kardashev-data",
  },
  ERCOT: {
    label: "ERCOT", region: "Texas",
    accent: "#38bdf8", accentRgb: "56,189,248",
    source: "ERCOT · kardashev-data",
  },
};

export default async function HomePage() {
  const { summaries, historyByIso, apiError } = await fetchDashboardData(90);

  const caiso = summaries.find((s) => s.iso === "CAISO");
  const totalSolar30d = summaries.reduce((a, s) => a + s.solar_mwh_30d, 0);
  const totalWind30d  = summaries.reduce((a, s) => a + s.wind_mwh_30d,  0);
  const totalAll30d   = summaries.reduce((a, s) => a + s.total_mwh_30d, 0);
  const hasData = summaries.length > 0;
  const latestDataDate = summaries.reduce(
    (max, s) => (s.latest_date > max ? s.latest_date : max),
    "",
  );

  return (
    <div style={{ minHeight: "100vh", color: "#fff", overflowX: "hidden", background: "#050f0b" }}>

      {/* Ambient orbs */}
      <div aria-hidden style={{ pointerEvents: "none", position: "fixed", inset: 0, zIndex: 0, overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: "-5%", left: "-5%",
          width: 900, height: 900, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(251,113,133,0.08) 0%, transparent 60%)",
          filter: "blur(130px)",
        }} />
        <div style={{
          position: "absolute", bottom: "-10%", right: "-5%",
          width: 700, height: 700, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(52,211,153,0.07) 0%, transparent 60%)",
          filter: "blur(130px)",
        }} />
      </div>

      {/* ── Hero (full-bleed photo) ── */}
      <header>
      <FadeUp delay={0}>
        <CurtailmentHero>
          <div className="hero-inner">
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 28,
              padding: "6px 14px", borderRadius: 999, fontSize: 10,
              textTransform: "uppercase", letterSpacing: "0.22em", fontWeight: 500,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(52,211,153,0.12)",
              color: "rgba(255,255,255,0.4)",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", display: "inline-block" }} />
              {hasData && latestDataDate
                ? `Daily · As of ${fmtDate(latestDataDate)} · Open source`
                : "Daily · Open source"}
            </span>

            {caiso ? (
              <>
                <h1 style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 20, maxWidth: 720 }}>
                  <span style={{ color: "#fb7185" }}>{fmtGwh(caiso.total_mwh_today)}</span>
                  {" "}curtailed in California yesterday
                </h1>
                <p style={{ fontSize: "1rem", lineHeight: 1.75, color: "rgba(255,255,255,0.55)", maxWidth: 460, marginBottom: 32 }}>
                  Solar and wind the grid could not take. {fmtDate(caiso.latest_date)} · {summaries.length} ISO{summaries.length !== 1 ? "s" : ""} tracked.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
                  {[
                    { value: fmtGwh(totalSolar30d), label: "Solar · 30d",  color: "#fb7185" },
                    { value: fmtGwh(totalWind30d),  label: "Wind · 30d",   color: "#34d399" },
                    { value: fmtGwh(totalAll30d),   label: "Total · 30d",  color: "rgba(255,255,255,0.7)" },
                    { value: `${summaries.length}`, label: "ISOs tracked", color: "rgba(255,255,255,0.5)" },
                  ].map((s) => (
                    <div key={s.label} style={{ padding: "8px 16px", borderRadius: 999, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(52,211,153,0.1)" }}>
                      <span style={{ fontFamily: MONO, fontWeight: 600, fontSize: "0.85rem", color: s.color }}>{s.value}</span>
                      <span style={{ marginLeft: 8, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,0.45)" }}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h1 style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 20, maxWidth: 720 }}>
                  US Curtailment <span style={{ color: "#fb7185" }}>Tracker</span>
                </h1>
                <p style={{ fontSize: "1rem", lineHeight: 1.75, color: "rgba(255,255,255,0.55)", maxWidth: 460 }}>
                  Daily solar and wind curtailment for CAISO, SPP, and ERCOT.
                  High numbers usually mean congestion or missing storage.
                </p>
              </>
            )}
          </div>
        </CurtailmentHero>
      </FadeUp>
      </header>

      <main className="page-inner">

        {/* ── API failure banner (partial data still renders below) ── */}
        {apiError && hasData && (
          <FadeUp delay={0.05}>
            <div role="alert" style={{
              display: "flex", alignItems: "center", gap: 10,
              marginBottom: 16, padding: "12px 18px", borderRadius: 14,
              border: "1px solid rgba(251,113,133,0.25)", background: "rgba(251,113,133,0.06)",
              fontSize: 12.5, color: "rgba(251,113,133,0.85)",
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#fb7185", flexShrink: 0 }} className="animate-pulse-slow" />
              Some data failed to load from the kardashev-data API. Charts may be incomplete. Refresh to retry.
            </div>
          </FadeUp>
        )}

        {/* ── ISO cards ── */}
        <h2 className="sr-only">Curtailment by ISO</h2>
        {hasData ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {summaries.map((s, i) => {
              const meta    = ISO_META[s.iso] ?? { label: s.iso, region: "", accent: "#94a3b8", accentRgb: "148,163,184", source: s.iso };
              const history = historyByIso[s.iso] ?? [];

              return (
                <FadeUp key={s.iso} delay={0.08 + i * 0.06}>
                  <div style={{ borderRadius: 28, border: `1px solid rgba(${meta.accentRgb},0.14)`, background: "#0b1812", overflow: "hidden" }}>
                    {/* Top bar */}
                    <div className="iso-card-top">
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          padding: "5px 12px", borderRadius: 999,
                          fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 600,
                          background: `rgba(${meta.accentRgb},0.1)`,
                          color: meta.accent,
                          border: `1px solid rgba(${meta.accentRgb},0.22)`,
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.accent }} className="animate-pulse-slow" />
                          {meta.label}
                        </span>
                        {meta.region && (
                          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", fontFamily: MONO }}>{meta.region}</span>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: MONO }}>{fmtDate(s.latest_date)}</span>
                    </div>

                    {/* Body */}
                    <div className="iso-card-body">
                      {/* Stats */}
                      <div className="iso-card-stats">
                        <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(251,113,133,0.07)", border: "1px solid rgba(251,113,133,0.14)" }}>
                          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(251,113,133,0.78)", marginBottom: 8 }}>Solar curtailed</div>
                          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fb7185", fontFamily: MONO }}>{fmtGwh(s.solar_mwh_today)}</div>
                        </div>
                        <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.13)" }}>
                          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(52,211,153,0.78)", marginBottom: 8 }}>Wind curtailed</div>
                          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#34d399", fontFamily: MONO }}>{fmtGwh(s.wind_mwh_today)}</div>
                        </div>
                        <div className="iso-card-stats-30d" style={{ paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: 5 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                            <span style={{ color: "rgba(255,255,255,0.45)" }}>Solar · 30d</span>
                            <span style={{ fontFamily: MONO, color: "rgba(251,113,133,0.8)" }}>{fmtGwh(s.solar_mwh_30d)}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                            <span style={{ color: "rgba(255,255,255,0.45)" }}>Wind · 30d</span>
                            <span style={{ fontFamily: MONO, color: "rgba(52,211,153,0.8)" }}>{fmtGwh(s.wind_mwh_30d)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Chart */}
                      <div className="iso-card-chart">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                          <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(255,255,255,0.4)" }}>90-day trend</span>
                          <div style={{ display: "flex", gap: 14, fontSize: 10, color: "rgba(255,255,255,0.42)" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <span style={{ display: "inline-block", width: 12, height: 1, background: "#fb7185" }} />Solar
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <span style={{ display: "inline-block", width: 12, height: 1, background: "#34d399" }} />Wind
                            </span>
                          </div>
                        </div>
                        <CurtailmentChart data={history} isoLabel={meta.label} />
                        <div style={{ marginTop: 10, textAlign: "right", fontSize: 10, color: "rgba(255,255,255,0.55)", fontFamily: MONO }}>
                          {meta.source}
                        </div>
                      </div>
                    </div>
                  </div>
                </FadeUp>
              );
            })}
          </div>
        ) : apiError ? (
          <FadeUp delay={0.1}>
            <div role="alert" style={{ borderRadius: 28, padding: "60px 40px", textAlign: "center", border: "1px solid rgba(251,113,133,0.22)", background: "#0b1812" }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(251,113,133,0.85)", marginBottom: 10 }}>
                Couldn&apos;t reach the data API
              </p>
              <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, maxWidth: 420, margin: "0 auto 14px" }}>
                The kardashev-data API didn&apos;t respond, so curtailment numbers can&apos;t be
                shown right now. This is usually temporary. Refresh in a minute.
              </p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>
                Check status:{" "}
                <a href="https://data.kardashevlabs.org/health" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(52,211,153,0.75)", textDecoration: "none" }}>data.kardashevlabs.org/health</a>
              </p>
            </div>
          </FadeUp>
        ) : (
          <FadeUp delay={0.1}>
            <div style={{ borderRadius: 28, padding: "60px 40px", textAlign: "center", border: "1px solid rgba(52,211,153,0.12)", background: "#0b1812" }}>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.42)", marginBottom: 12 }}>No data yet. Ingested daily via kardashev-data.</p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>
                Source:{" "}
                <a href="https://data.kardashevlabs.org/curtailment/summary" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(52,211,153,0.75)", textDecoration: "none" }}>data.kardashevlabs.org</a>
              </p>
            </div>
          </FadeUp>
        )}

        {/* ── Bottom row ── */}
        <FadeUp delay={0.2}>
          <div className="bottom-grid">
            <div style={{ borderRadius: 24, border: "1px solid rgba(52,211,153,0.1)", background: "#0b1812", overflow: "hidden" }}>
              <div style={{ background: "#050f0b", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <Image
                  src="/images/og-duck-curve.png"
                  alt="The duck curve: midday solar dips net load, evening demand peaks"
                  width={1200}
                  height={630}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
              <div style={{ padding: "24px 28px 28px" }}>
                <h2 style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.45)", marginBottom: 16 }}>What is curtailment?</h2>
                <p style={{ fontSize: "0.875rem", lineHeight: 1.8, color: "rgba(255,255,255,0.58)" }}>
                  When the grid can&apos;t absorb all available solar and wind, operators instruct generators
                  to produce less, even when the sun is shining. High curtailment signals congested
                  transmission, insufficient storage, or poor demand timing.
                </p>
                <p style={{ fontSize: "0.875rem", lineHeight: 1.8, color: "rgba(255,255,255,0.45)", marginTop: 12 }}>
                  CAISO leads in solar curtailment (the{" "}
                  <a
                    href="https://en.wikipedia.org/wiki/Duck_curve"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "rgba(251,113,133,0.85)", textDecoration: "underline", textDecorationColor: "rgba(251,113,133,0.35)", textUnderlineOffset: "3px" }}
                  >
                    duck curve
                  </a>
                  ). SPP leads in wind curtailment across the Great Plains.
                </p>
              </div>
            </div>

            <div style={{ borderRadius: 24, border: "1px solid rgba(52,211,153,0.1)", background: "#0b1812", overflow: "hidden" }}>
              <div style={{ background: "#050f0b", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <Image
                  src="/images/hero-wind-curtailment.jpg"
                  alt="Wind turbines on the Great Plains at dusk"
                  width={1200}
                  height={630}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
              <div style={{ padding: "24px 28px 28px" }}>
                <h2 style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.45)", marginBottom: 12 }}>Open source</h2>
                <p style={{ fontSize: "0.875rem", lineHeight: 1.8, color: "rgba(255,255,255,0.52)", marginBottom: 20 }}>
                  kardashev-data API · Next.js. CAISO + SPP live. Fork it, add yours.
                </p>
                <a
                  href="https://github.com/kardashev-lab/curtailment-tracker"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "12px 16px", borderRadius: 999, textDecoration: "none", fontSize: "0.875rem", fontWeight: 600, color: "rgba(255,255,255,0.75)", background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.18)", marginBottom: 16 }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.6 }}>
                      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                    View on GitHub
                  </span>
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", background: "rgba(52,211,153,0.12)", fontSize: 12 }}>↗</span>
                </a>
                <div className="related-tools">
                  {[
                    { label: "Queue Tracker", href: "https://interconnection-queue.kardashevlabs.org" },
                    { label: "Grid Demand", href: "https://grid-demand.kardashevlabs.org" },
                    { label: "Site Clearance", href: "https://clearance.kardashevlabs.org" },
                    { label: "Large Load", href: "https://large-load-tracker.kardashevlabs.org" },
                  ].map((t) => (
                    <a key={t.label} href={t.href} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textAlign: "center", padding: "12px 14px", borderRadius: 12, fontSize: 11, fontWeight: 500, textDecoration: "none", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.52)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      {t.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeUp>
      </main>

      {/* Footer */}
      <footer style={{ position: "relative", zIndex: 10, padding: "0 24px 40px" }}>
        <div style={{ maxWidth: 1152, margin: "0 auto", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: MONO }}>
            © {new Date().getFullYear()}{" "}
            <a href="https://kardashevlabs.org" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.65)", textDecoration: "none" }}>Kardashev Labs</a>
            {" · "}Data via{" "}
            <a href="https://data.kardashevlabs.org" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.65)", textDecoration: "none" }}>kardashev-data</a>
            {" · "}
            <a href="https://github.com/kardashev-lab" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.65)", textDecoration: "none" }}>github.com/kardashev-lab</a>
            {" · "}Use this data in Python:{" "}
            <a href="https://pypi.org/project/kardashev/" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.65)", textDecoration: "none" }}>pip install kardashev</a>
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.52)", fontFamily: MONO }}>curtailment-tracker.kardashevlabs.org</p>
        </div>
      </footer>
    </div>
  );
}
