import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
} from 'recharts';

/**
 * 디지털 바이오마커 측정용 PDF 캡처 차트.
 *
 * PdfPrintChart 와 같은 시각 원칙(고정 px, ResponsiveContainer 없음,
 * isAnimationActive=false)을 따른다. 화면(SymptomDetail.tsx)의 컨디션 섹션과
 * 동일하게 단일 톤 막대만 표시하며, baseline 평균선/평균 라벨은 그리지 않는다.
 * (평균 값은 상위(PDF) 페이지의 카드 안 "평균 박스"에서 표기한다.)
 */

type Row = { date: string; value: number | null };

export type PdfMeasurementChartSpec = {
  key: string;                 // 'measurement_tap' | 'measurement_reaction'
  data: Row[];
  color: string;               // 단일 톤 막대 색
  yDomain: [number, number];
  yTicks?: number[];
  yUnit?: string;
};

const PX_W = 1040;
const PX_H = 360;

function isEmpty(data: Row[]) {
  if (!data.length) return true;
  return data.every((r) => r.value == null);
}

export function PdfMeasurementChart({ spec }: { spec: PdfMeasurementChartSpec }) {
  const { data, color, yDomain, yTicks, yUnit } = spec;
  // 측정 그래프(탭핑·반응속도) 방향: 왼쪽=최신, 오른쪽=과거.
  // 원본 spec.data 는 과거→최신 순서이므로 표시 직전에 한 번만 reverse 한다.
  // (다른 PDF 그래프는 PdfPrintChart 가 담당하므로 영향 없음.)
  const displayData = [...data].reverse();
  const empty = isEmpty(displayData);
  const radius: [number, number, number, number] = [6, 6, 0, 0];
  const stride = Math.max(1, Math.ceil(displayData.length / 16));

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
          data={displayData}
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
            width={56}
            tickLine={false}
            axisLine={false}
          />
          <Bar
            dataKey="value"
            fill={color}
            barSize={10}
            radius={radius}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="value"
              position="top"
              offset={6}
              fill="#222"
              fontSize={11}
              formatter={(v: unknown) => {
                if (v == null) return '';
                const n = typeof v === 'number' ? v : Number(v);
                if (!Number.isFinite(n) || n === 0) return '';
                return String(Math.round(n));
              }}
            />
          </Bar>
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
            기록이 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
