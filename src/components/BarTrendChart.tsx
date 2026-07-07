import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { useMemo, useRef, useState, useEffect } from 'react';
import { useRange } from '../context/RangeContext';
import type { MedChange } from '../lib/queries';
import { isEnLang } from '../i18n/currentLang';

/** 5색 팔레트 (점수 1~5) */
export const SCORE_COLORS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '#A23C4C', // 진한 적
  2: '#E76A6A', // 적
  3: '#9E9E9E', // 회색
  4: '#C8E6C9', // 연녹색/민트
  5: '#4CAF50', // 진녹색
};

const SCORE_LABEL_KO: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '매우나쁨',
  2: '나쁨',
  3: '보통',
  4: '좋음',
  5: '매우좋음',
};
const SCORE_LABEL_EN: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Very bad',
  2: 'Bad',
  3: 'OK',
  4: 'Good',
  5: 'Very good',
};
/** 함수형 getter — lang 변경 시(모듈 상수와 달리) 항상 최신 로케일 값을 반환. */
export function getScoreLabel(): Record<1 | 2 | 3 | 4 | 5, string> {
  return isEnLang() ? SCORE_LABEL_EN : SCORE_LABEL_KO;
}

type SingleSeries = { key: string; name: string; color: string };

type CommonProps = {
  data: Record<string, any>[];
  refLines?: MedChange[];
  height?: number;
  yDomain?: [number | 'auto', number | 'auto'];
  yTicks?: number[];
  yUnit?: string;
  noTrendline?: boolean;
  /** 차트 위쪽 범례 행에 표시할 평균값 라벨 (예: "평균 50회"). 미지정 시 미표시. */
  meanLabel?: string;
};

type Props =
  | (CommonProps & {
      mode: 'score5stack';
    })
  | (CommonProps & {
      mode: 'single';
      series: SingleSeries;
    })
  | (CommonProps & {
      mode: 'binary';
      yesKey: string;
      noKey: string;
      yesName?: string;
      noName?: string;
      yesColor?: string;
      noColor?: string;
    });

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

export default function BarTrendChart(props: Props) {
  const { brushIndex, setBrushIndex, brushSync, showTrendline: showTrendlineCtx } = useRange();
  const showTrendline = showTrendlineCtx && !props.noTrendline;
  const [localBrush, setLocalBrush] = useState<{ startIndex?: number; endIndex?: number }>({});
  const { data, refLines, height = 140, yDomain, yTicks, yUnit, meanLabel } = props;

  const dataWithTrend = useMemo(() => {
    if (!showTrendline) return data;
    let trendKey: string | null = null;
    if (props.mode === 'single') trendKey = props.series.key;
    else if (props.mode === 'score5stack') {
      return data.map((row) => {
        const t = (row.c1 || 0) + (row.c2 || 0) + (row.c3 || 0) + (row.c4 || 0) + (row.c5 || 0);
        const avg = t ? ((row.c1 || 0) * 1 + (row.c2 || 0) * 2 + (row.c3 || 0) * 3 + (row.c4 || 0) * 4 + (row.c5 || 0) * 5) / t : null;
        return { ...row, __avg: avg };
      });
    } else if (props.mode === 'binary') {
      return data;
    }
    if (!trendKey) return data;
    const trend = computeTrendline(data, trendKey);
    return data.map((row, i) => ({ ...row, __trend: trend[i] }));
  }, [data, showTrendline, props]);

  const finalData = useMemo(() => {
    if (props.mode === 'score5stack' && showTrendline) {
      const trend = computeTrendline(dataWithTrend, '__avg');
      return dataWithTrend.map((r, i) => ({ ...r, __trend: trend[i] }));
    }
    return dataWithTrend;
  }, [dataWithTrend, showTrendline, props.mode]);

  // 표시할 윈도우 — 기본 30일
  const WINDOW = 30;
  const totalLen = finalData.length;
  const defaultEnd = totalLen ? totalLen - 1 : 0;
  const defaultStart = Math.max(0, defaultEnd - (WINDOW - 1));

  const startIdx =
    (brushSync ? brushIndex.startIndex : localBrush.startIndex) ?? defaultStart;
  const endIdx =
    (brushSync ? brushIndex.endIndex : localBrush.endIndex) ?? defaultEnd;

  // 윈도우 슬라이스
  const windowData = useMemo(() => {
    if (!totalLen) return finalData;
    const s = Math.max(0, Math.min(totalLen - 1, startIdx));
    const e = Math.max(s, Math.min(totalLen - 1, endIdx));
    return finalData.slice(s, e + 1);
  }, [finalData, startIdx, endIdx, totalLen]);

  // 드래그 팬 핸들러
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; startIdx: number; endIdx: number; pxPerDay: number } | null>(null);

  const updateRange = (next: { startIndex: number; endIndex: number }) => {
    if (brushSync) setBrushIndex(next);
    else setLocalBrush(next);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !totalLen) return;
    const winSize = endIdx - startIdx + 1;
    const w = containerRef.current.clientWidth;
    const pxPerDay = Math.max(1, w / winSize);
    dragRef.current = { x: e.clientX, startIdx, endIdx, pxPerDay };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const deltaDays = Math.round(-dx / d.pxPerDay);
    if (deltaDays === 0) return;
    const winSize = d.endIdx - d.startIdx + 1;
    let ns = d.startIdx + deltaDays;
    let ne = d.endIdx + deltaDays;
    if (ns < 0) { ns = 0; ne = winSize - 1; }
    if (ne > totalLen - 1) { ne = totalLen - 1; ns = ne - winSize + 1; }
    updateRange({ startIndex: ns, endIndex: ne });
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

  // brushSync 켜고 초기화 시 brushIndex 초기값 세팅
  useEffect(() => {
    if (brushSync && (brushIndex.startIndex == null || brushIndex.endIndex == null) && totalLen) {
      setBrushIndex({ startIndex: defaultStart, endIndex: defaultEnd });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brushSync, totalLen]);

  const radius: [number, number, number, number] = [6, 6, 0, 0];

  // 데이터 전체가 비어 있는지 (모든 값 null/0) 판정 — single/binary/score5stack 공통
  const isEmpty = useMemo(() => {
    if (!windowData.length) return true;
    if (props.mode === 'single') {
      const k = props.series.key;
      return windowData.every((r) => r[k] == null);
    }
    if (props.mode === 'binary') {
      return windowData.every((r) => (r[props.yesKey] ?? 0) === 0 && (r[props.noKey] ?? 0) === 0);
    }
    if (props.mode === 'score5stack') {
      return windowData.every((r) => !((r.c1 || 0) + (r.c2 || 0) + (r.c3 || 0) + (r.c4 || 0) + (r.c5 || 0)));
    }
    return false;
  }, [windowData, props]);

  return (
    <div>
    {meanLabel && (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 6, paddingLeft: 4,
        fontSize: 13, color: '#555',
      }}>
        <span style={{
          display: 'inline-block', width: 10, height: 10, borderRadius: 2,
          background: '#9aa3a8',
        }} />
        <span>{meanLabel}</span>
      </div>
    )}
    <div
      ref={containerRef}
      className="chart-wrap"
      style={{ height, overflow: 'hidden', touchAction: 'pan-y', cursor: 'grab', userSelect: 'none', position: 'relative' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={windowData} margin={{ top: 28, right: 12, bottom: 0, left: 0 }} barCategoryGap="20%">
          <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#888' }} minTickGap={20} tickLine={false} axisLine={{ stroke: '#e0e0e0' }} />
          <YAxis
            domain={yDomain ?? ['auto', 'auto']}
            ticks={yTicks}
            tick={{ fontSize: 11, fill: '#888' }}
            unit={yUnit}
            width={40}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            contentStyle={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 13 }}
          />
          {props.mode === 'score5stack' && (
            <>
              <Bar dataKey="c1" stackId="s" name="1점" fill="#C8E6C9" barSize={10} radius={[0, 0, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="c2" stackId="s" name="2점" fill="#C8E6C9" barSize={10} radius={[0, 0, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="c3" stackId="s" name="3점" fill="#C8E6C9" barSize={10} radius={[0, 0, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="c4" stackId="s" name="4점" fill="#C8E6C9" barSize={10} radius={[0, 0, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="c5" stackId="s" name="5점" fill="#C8E6C9" barSize={10} radius={radius}      isAnimationActive={false} />
            </>
          )}

          {props.mode === 'single' && (
            <Bar
              dataKey={props.series.key}
              name={props.series.name}
              fill={props.series.color}
              barSize={10}
              radius={radius}
              isAnimationActive={false}
            />
          )}

          {props.mode === 'binary' && (
            <>
              <Bar
                dataKey={props.yesKey}
                stackId="b"
                name={props.yesName ?? '변 본 날'}
                fill={props.yesColor ?? '#4CAF50'}
                barSize={10}
                radius={[0, 0, 0, 0]}
                isAnimationActive={false}
              />
              <Bar
                dataKey={props.noKey}
                stackId="b"
                name={props.noName ?? '안 본 날'}
                fill={props.noColor ?? '#cfd8dc'}
                barSize={10}
                radius={radius}
                isAnimationActive={false}
              />
            </>
          )}

          {showTrendline && (props.mode === 'single' || props.mode === 'score5stack') && (
            <Line
              type="linear"
              dataKey="__trend"
              name="추세"
              stroke="#555"
              strokeDasharray="5 5"
              strokeWidth={1.5}
              dot={false}
              connectNulls
              isAnimationActive={false}
              legendType="none"
            />
          )}

          {[...(refLines ?? [])].sort((a, b) => a.date.localeCompare(b.date)).map((r, i) => {
            const n = i + 1;
            const badge = n <= 20
              ? String.fromCharCode(0x2460 + n - 1) // ①②③…⑳
              : `(${n})`;
            return (
              <ReferenceLine
                key={i}
                x={r.date}
                stroke="#ef6c00"
                strokeDasharray="4 4"
                label={{ value: badge, position: 'top', fontSize: 18, fill: '#ef6c00', fontWeight: 700 }}
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
      {isEmpty && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9aa3a8',
            fontSize: 13,
            pointerEvents: 'none',
          }}
        >
          기록이 없습니다
        </div>
      )}
    </div>
    {(refLines ?? []).length > 0 && (
      <div style={{
        marginTop: 10, padding: '10px 12px',
        background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8,
        fontSize: 14, color: '#7c2d12', lineHeight: 1.7,
      }}>
        <div style={{ fontWeight: 700, marginBottom: 4, color: '#9a3412' }}>약 변경 기록</div>
        {[...(refLines ?? [])].sort((a, b) => a.date.localeCompare(b.date)).map((r, i) => {
          const n = i + 1;
          const badge = n <= 20 ? String.fromCharCode(0x2460 + n - 1) : `(${n})`;
          const md = r.date.slice(5).replace('-', '/');
          return (
            <div key={i}>
              <span style={{ fontWeight: 700, marginRight: 6 }}>{badge}</span>
              {md} {r.label}
            </div>
          );
        })}
      </div>
    )}
    </div>
  );
}

void Cell;
