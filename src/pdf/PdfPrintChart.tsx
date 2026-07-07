import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, ReferenceLine,
} from 'recharts';
import type { MedChange } from '../lib/queries';
import { useT } from '../i18n';

/**
 * PDF 캡처 전용 차트.
 *
 * 화면(`src/components/BarTrendChart.tsx`)의 `mode="single"` 렌더와
 * 시각 구성(색/막대크기/모서리/축/마커 배지)을 100% 동일하게 맞춘 컴포넌트.
 *
 * 차이점은 "PDF에 맞춤"을 위한 것뿐:
 *  - RangeContext(useRange) 비의존 → 오프스크린에서 단독 마운트 가능
 *  - 30일 윈도우/드래그 팬 없음 → 선택한 전체 기간을 한 장에 표시
 *  - ResponsiveContainer 대신 고정 px(width/height) → html-to-image 캡처 안정
 *  - isAnimationActive=false → 캡처 시 미완성 프레임 방지
 *
 * 결과적으로 같은 Recharts 엔진이 같은 색/막대/축으로 그리므로
 * 화면과 동일한 디자인이 되고, 한글 라벨도 브라우저가 그린 비트맵이라
 * @react-pdf 의 Helvetica 폴백 깨짐이 발생하지 않는다.
 */

type SingleRow = { date: string; [k: string]: string | number | null | undefined };

export type PdfChartSpec = {
  /** 차트 식별 키 (체크박스 단계에서 섹션 토글에 사용) */
  key: string;
  data: SingleRow[];
  /** 값이 담긴 필드명 (예: 'adherence' | 'score' | 'minutes' | 'value') */
  valueKey: string;
  color: string;
  yDomain: [number, number];
  yTicks: number[];
  yUnit?: string;
  refLines?: MedChange[];
  /** 화면 RangeContext.showTrendline 값. 변비처럼 추세선 미적용 차트는 false 로 전달 */
  showTrendline?: boolean;
};

/**
 * 화면 BarTrendChart.computeTrendline 와 100% 동일한 선형회귀.
 * (중복 계산 아님 — 동일 식·반올림(소수 2자리) 이식)
 */
function computeTrendline(data: SingleRow[], key: string): (number | null)[] {
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

const PX_W = 1040; // 캡처 픽셀 폭 (A4 가로 차트 영역에 선명하게 들어감)
const PX_H = 360;

function circledBadge(n: number) {
  return n <= 20 ? String.fromCharCode(0x2460 + n - 1) : `(${n})`;
}

function isEmpty(data: SingleRow[], valueKey: string) {
  if (!data.length) return true;
  return data.every((r) => r[valueKey] == null);
}

export function PdfPrintChart({ spec }: { spec: PdfChartSpec }) {
  const { t } = useT();
  const { data, valueKey, color, yDomain, yTicks, yUnit, refLines, showTrendline } = spec;
  const empty = isEmpty(data, valueKey);
  const radius: [number, number, number, number] = [6, 6, 0, 0];

  // 라벨 과밀 방지 — 화면 minTickGap=20 과 유사한 효과
  const stride = Math.max(1, Math.ceil(data.length / 16));

  // 화면(BarTrendChart)과 동일: showTrendline 이면 __trend 주입
  const chartData = (() => {
    if (!showTrendline) return data;
    const trend = computeTrendline(data, valueKey);
    return data.map((row, i) => ({ ...row, __trend: trend[i] }));
  })();

  const sortedChanges = [...(refLines ?? [])].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div style={{ width: PX_W, background: '#fff', boxSizing: 'border-box' }}>
    <div
      style={{
        width: PX_W,
        height: PX_H,
        background: '#fff',
        padding: '8px 8px 0 0',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      <ComposedChart
        width={PX_W}
        height={PX_H}
        data={chartData}
        margin={{ top: 28, right: 12, bottom: 4, left: 0 }}
        barCategoryGap="20%"
      >
        <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 13, fill: '#888' }}
          tickFormatter={(v: string, i: number) => (i % stride === 0 ? String(v).slice(5) : '')}
          interval={0}
          tickLine={false}
          axisLine={{ stroke: '#e0e0e0' }}
        />
        <YAxis
          domain={yDomain}
          ticks={yTicks}
          tick={{ fontSize: 13, fill: '#888' }}
          unit={yUnit}
          width={44}
          tickLine={false}
          axisLine={false}
        />
        <Bar
          dataKey={valueKey}
          fill={color}
          barSize={10}
          radius={radius}
          isAnimationActive={false}
        />
        {showTrendline && (
          <Line
            type="linear"
            dataKey="__trend"
            name={t('pdfChart.trend')}
            stroke="#555"
            strokeDasharray="5 5"
            strokeWidth={1.5}
            dot={false}
            connectNulls
            isAnimationActive={false}
            legendType="none"
          />
        )}
        {sortedChanges.map((r, i) => (
          <ReferenceLine
            key={i}
            x={r.date}
            stroke="#ef6c00"
            strokeDasharray="4 4"
            label={{ value: circledBadge(i + 1), position: 'top', fontSize: 18, fill: '#ef6c00', fontWeight: 700 }}
          />
        ))}
      </ComposedChart>

      {empty && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9aa3a8',
            fontSize: 16,
            pointerEvents: 'none',
          }}
        >
          {t('pdfChart.noRecords')}
        </div>
      )}
    </div>

    {/* 약 변경 정보 — 화면 BarTrendChart 의 주황 박스와 동일 (문구·형식·순서) */}
    {sortedChanges.length > 0 && (
      <div
        style={{
          margin: '10px 8px 8px 0',
          padding: '12px 16px',
          background: '#FFF7ED',
          border: '1px solid #FED7AA',
          borderRadius: 8,
          fontSize: 16,
          color: '#7c2d12',
          lineHeight: 1.7,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 4, color: '#9a3412' }}>{t('pdfChart.medChangeRecord')}</div>
        {sortedChanges.map((r, i) => {
          const md = r.date.slice(5).replace('-', '/');
          return (
            <div key={i}>
              <span style={{ fontWeight: 700, marginRight: 6 }}>{circledBadge(i + 1)}</span>
              {md} {r.label}
            </div>
          );
        })}
      </div>
    )}
    </div>
  );
}
