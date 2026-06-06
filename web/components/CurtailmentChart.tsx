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
import type { DailyRow } from "@/lib/db";

type Props = { data: DailyRow[]; iso: string };

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(0);
}

export default function CurtailmentChart({ data, iso }: Props) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-white/20 text-sm">
        No data yet — fetcher runs daily at 08:00 UTC.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: d.date.slice(5),        // "MM-DD"
    solar: Math.round(d.solar_mwh),
    wind: Math.round(d.wind_mwh),
    total: Math.round(d.total_mwh),
  }));

  const hasSolar = data.some((d) => d.solar_mwh > 0);
  const hasWind = data.some((d) => d.wind_mwh > 0);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="windGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.25)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={fmt}
          width={38}
        />
        <Tooltip
          contentStyle={{
            background: "#0f172a",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "rgba(255,255,255,0.5)", marginBottom: 4 }}
          formatter={(value: number, name: string) => [
            `${value.toLocaleString()} MWh`,
            name.charAt(0).toUpperCase() + name.slice(1),
          ]}
        />
        {hasSolar && (
          <Area
            type="monotone"
            dataKey="solar"
            stroke="#f59e0b"
            strokeWidth={1.5}
            fill="url(#solarGrad)"
            dot={false}
            activeDot={{ r: 3, fill: "#f59e0b" }}
          />
        )}
        {hasWind && (
          <Area
            type="monotone"
            dataKey="wind"
            stroke="#60a5fa"
            strokeWidth={1.5}
            fill="url(#windGrad)"
            dot={false}
            activeDot={{ r: 3, fill: "#60a5fa" }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
