"use client";

import { useMemo, useState, type MouseEvent } from "react";
import {
  AreaSeries,
  Axis,
  ChartFrame,
  ChartTooltip,
  LineSeries,
  closestIndex,
  clientToViewBoxX,
  createLinearScales,
  padDomain,
} from "kardashev-charts";
import type { DailyRow } from "@/lib/api";

type Props = {
  data: DailyRow[];
  isoLabel?: string;
};

function fmtGwh(mwh: number) {
  const gwh = mwh / 1000;
  return gwh >= 1 ? `${gwh.toFixed(1)} GWh` : `${Math.round(mwh)} MWh`;
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

  const latest = data[data.length - 1];
  const chartLabel = [
    `${isoLabel ? `${isoLabel} ` : ""}daily solar and wind curtailment over the last ${data.length} days.`,
    latest
      ? `Most recent day: ${fmtGwh(latest.solar_mwh)} solar and ${fmtGwh(latest.wind_mwh)} wind curtailed.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div role="img" aria-label={chartLabel}>
      <ChartFrame height={240} theme="substation" minWidth={60}>
        {(size) => <CurtailmentInner data={data} width={size.width} height={size.height} />}
      </ChartFrame>
    </div>
  );
}

function CurtailmentInner({
  data,
  width,
  height,
}: {
  data: DailyRow[];
  width: number;
  height: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const padding = { top: 4, right: 2, bottom: 24, left: 46 };
  const hasSolar = data.some((d) => d.solar_mwh > 0);
  const hasWind = data.some((d) => d.wind_mwh > 0);

  const { scales, xs, solarPts, windPts, yTicks, xTicks } = useMemo(() => {
    const n = data.length;
    const vals = data.flatMap((d) => [d.solar_mwh, d.wind_mwh]);
    const [, hi] = padDomain(0, Math.max(...vals, 0), 0.08);
    const scales = createLinearScales({
      width,
      height,
      xDomain: [0, Math.max(n - 1, 1)],
      yDomain: [0, hi],
      padding,
    });
    const xs = data.map((_, i) => scales.x(i));
    const solarPts = data.map((d, i) => ({
      x: scales.x(i),
      y: scales.y(Math.round(d.solar_mwh)),
    }));
    const windPts = data.map((d, i) => ({
      x: scales.x(i),
      y: scales.y(Math.round(d.wind_mwh)),
    }));
    const tickCount = Math.min(6, n);
    const xTicks = Array.from({ length: tickCount }, (_, i) => {
      const idx = tickCount === 1 ? 0 : Math.round((i / (tickCount - 1)) * (n - 1));
      return { value: idx, label: data[idx].date.slice(5) };
    });
    const yTicks = [0, hi / 2, hi].map((v) => ({
      value: v,
      label: fmtGwh(v),
    }));
    return { scales, xs, solarPts, windPts, yTicks, xTicks };
  }, [data, width, height]);

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    setHover(closestIndex(xs, clientToViewBoxX(e.currentTarget, e.clientX, width)));
  };

  const h = hover != null ? data[hover] : null;
  const hx = hover != null ? xs[hover] : null;

  return (
    <div style={{ position: "relative", width, height }}>
      <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fb7185" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#fb7185" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="windGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Axis
          x={scales.x}
          y={scales.y}
          width={width}
          height={height}
          padding={padding}
          theme="substation"
          xTicks={xTicks}
          yTicks={yTicks}
          showGrid
        />
        {hasSolar && (
          <>
            <AreaSeries
              points={solarPts}
              y0={scales.y(0)}
              fill="url(#solarGrad)"
              fillOpacity={1}
              curve="monotone"
            />
            <LineSeries points={solarPts} stroke="#fb7185" strokeWidth={1.5} curve="monotone" />
          </>
        )}
        {hasWind && (
          <>
            <AreaSeries
              points={windPts}
              y0={scales.y(0)}
              fill="url(#windGrad)"
              fillOpacity={1}
              curve="monotone"
            />
            <LineSeries points={windPts} stroke="#34d399" strokeWidth={1.5} curve="monotone" />
          </>
        )}
        {hx != null && (
          <line
            x1={hx}
            x2={hx}
            y1={padding.top}
            y2={height - padding.bottom}
            stroke="rgba(255,255,255,0.06)"
          />
        )}
      </svg>
      {h && hx != null && (
        <div style={{ position: "absolute", left: Math.min(hx + 8, width - 160), top: 8 }}>
          <ChartTooltip theme="substation">
            <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: 6, fontSize: 11 }}>
              {h.date.slice(5)}
            </p>
            <div style={{ display: "flex", gap: 8, marginBottom: 3 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fb7185", marginTop: 4 }} />
              <span style={{ color: "rgba(255,255,255,0.55)" }}>Solar</span>
              <span style={{ color: "#fff" }}>{fmtGwh(h.solar_mwh)}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", marginTop: 4 }} />
              <span style={{ color: "rgba(255,255,255,0.55)" }}>Wind</span>
              <span style={{ color: "#fff" }}>{fmtGwh(h.wind_mwh)}</span>
            </div>
          </ChartTooltip>
        </div>
      )}
    </div>
  );
}
