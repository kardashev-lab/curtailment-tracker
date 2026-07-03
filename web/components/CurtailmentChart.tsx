"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyRow } from "@/lib/api";

type Props = {
  data: DailyRow[];
  /** ISO name used in the chart's screen-reader description. */
  isoLabel?: string;
};

function fmtGwh(mwh: number) {
  const gwh = mwh / 1000;
  return gwh >= 1 ? `${gwh.toFixed(1)} GWh` : `${Math.round(mwh)} MWh`;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "rgba(5,15,11,0.95)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: "10px 14px",
        fontSize: 12,
        backdropFilter: "blur(16px)",
      }}
    >
      <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: 6, fontSize: 11, letterSpacing: "0.08em" }}>
        {label}
      </p>
      {payload.map((p) => (
        <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
          <span style={{ color: "rgba(255,255,255,0.55)", minWidth: 36 }}>{p.name}</span>
          <span style={{ color: "#fff", fontFamily: "var(--font-jetbrains-mono, monospace)", fontWeight: 500 }}>
            {fmtGwh(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function CurtailmentChart({ data, isoLabel }: Props) {
  if (!data.length) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 240,
          color: "rgba(255,255,255,0.35)",
          fontSize: 13,
        }}
      >
        No data yet. Fetcher runs daily at 08:00 UTC.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: d.date.slice(5),
    Solar: Math.round(d.solar_mwh),
    Wind: Math.round(d.wind_mwh),
  }));

  const hasSolar = data.some((d) => d.solar_mwh > 0);
  const hasWind  = data.some((d) => d.wind_mwh > 0);

  const latest = data[data.length - 1];
  const chartLabel = [
    `${isoLabel ? `${isoLabel} ` : ""}daily solar and wind curtailment over the last ${data.length} days.`,
    latest ? `Most recent day: ${fmtGwh(latest.solar_mwh)} solar and ${fmtGwh(latest.wind_mwh)} wind curtailed.` : null,
  ].filter(Boolean).join(" ");

  return (
    <div role="img" aria-label={chartLabel}>
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={chartData} margin={{ top: 4, right: 2, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#fb7185" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#fb7185" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="windGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#34d399" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid
          strokeDasharray="2 6"
          stroke="rgba(255,255,255,0.04)"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.35)", fontFamily: "var(--font-jetbrains-mono, monospace)" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          tickMargin={8}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.35)", fontFamily: "var(--font-jetbrains-mono, monospace)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => fmtGwh(v)}
          width={46}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 }} />

        {hasSolar && (
          <Area
            type="monotone"
            dataKey="Solar"
            stroke="#fb7185"
            strokeWidth={1.5}
            fill="url(#solarGrad)"
            dot={false}
            activeDot={{ r: 3, fill: "#fb7185", strokeWidth: 0 }}
          />
        )}
        {hasWind && (
          <Area
            type="monotone"
            dataKey="Wind"
            stroke="#34d399"
            strokeWidth={1.5}
            fill="url(#windGrad)"
            dot={false}
            activeDot={{ r: 3, fill: "#34d399", strokeWidth: 0 }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
    </div>
  );
}
