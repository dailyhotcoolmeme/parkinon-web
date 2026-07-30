import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Brush, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useMemo, useState } from 'react';
import { tr } from '../i18n';
import { useRange } from '../context/RangeContext';
import type { MedChange } from '../lib/queries';

export type Series = {
  key: string;
  name: string;
  color: string;
};

type Props = {
  data: Record<string, any>[];
  series: Series[];
  yDomain?: [number | 'auto', number | 'auto'];
  yUnit?: string;
  refLines?: MedChange[];
  height?: number;
  tooltipContent?: any;
};

/** 선형 회귀 추세선: y = a + b*x (x = index) */
function computeTrendline(data: Record<string, any>[], key: string): (number | null)[] {
  const pts: { x: number; y: number }[] = [];
  data.forEach((row, i) => {
    const v = row[key];
    if (v != null && !Number.isNaN(Number(v))) pts.push({ x: i, y: Number(v) });
  });
  if (pts.length < 2) return data.map(() => null);
  const n = pts.length;
  const sx = pts.reduce((a, p) => a + p.x, 0);
  const sy = pts.reduce((a, p) => a + p.y, 0);
  const sxx = pts.reduce((a, p) => a + p.x * p.x, 0);
  const sxy = pts.reduce((a, p) => a + p.x * p.y, 0);
  const denom = n * sxx - sx * sx;
  if (denom === 0) return data.map(() => null);
  const b = (n * sxy - sx * sy) / denom;
  const a = (sy - b * sx) / n;
  return data.map((_, i) => Math.round((a + b * i) * 100) / 100);
}

export default function TrendChart({ data, series, yDomain, yUnit, refLines, height = 160, tooltipContent }: Props) {
  const { brushIndex, setBrushIndex, brushSync, showTrendline } = useRange();
  const [localBrush, setLocalBrush] = useState<{ startIndex?: number; endIndex?: number }>({});

  const dataWithTrend = useMemo(() => {
    if (!showTrendline) return data;
    const trends: Record<string, (number | null)[]> = {};
    for (const s of series) trends[`__trend_${s.key}`] = computeTrendline(data, s.key);
    return data.map((row, i) => {
      const r: Record<string, any> = { ...row };
      for (const s of series) r[`__trend_${s.key}`] = trends[`__trend_${s.key}`][i];
      return r;
    });
  }, [data, series, showTrendline]);

  const start = brushSync ? brushIndex.startIndex : localBrush.startIndex;
  const end = brushSync ? brushIndex.endIndex : localBrush.endIndex;
  const onBrush = (b: any) => {
    const next = { startIndex: b.startIndex, endIndex: b.endIndex };
    if (brushSync) setBrushIndex(next);
    else setLocalBrush(next);
  };

  return (
    <div className="chart-wrap chart-scroll" style={{ height }}>
      <div className="chart-scroll-inner" style={{ height: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dataWithTrend} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={20} />
            <YAxis
              domain={yDomain ?? ['auto', 'auto']}
              tick={{ fontSize: 12 }}
              unit={yUnit}
              width={48}
            />
            <Tooltip content={tooltipContent} />
            <Legend />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
            {showTrendline && series.map((s) => (
              <Line
                key={`trend-${s.key}`}
                type="linear"
                dataKey={`__trend_${s.key}`}
                name={tr('chart.namedTrend', { name: s.name })}
                stroke={s.color}
                strokeDasharray="5 5"
                strokeWidth={1.5}
                dot={false}
                connectNulls
                isAnimationActive={false}
                legendType="none"
              />
            ))}
            {(refLines ?? []).map((r, i) => (
              <ReferenceLine
                key={i}
                x={r.date}
                stroke="#ef6c00"
                strokeDasharray="4 4"
                label={{ value: r.label, position: 'top', fontSize: 11, fill: '#ef6c00' }}
              />
            ))}
            <Brush
              dataKey="date"
              height={28}
              stroke="#4CAF50"
              startIndex={start}
              endIndex={end}
              onChange={onBrush}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
