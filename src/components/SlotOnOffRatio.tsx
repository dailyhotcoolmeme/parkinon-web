import { useMemo } from 'react';
import { tr } from '../i18n';
import { useRange } from '../context/RangeContext';
import type { SlotDayStatRow } from '../lib/queries';

/**
 * 차트 상단에 표시되는 ON/OFF 비율.
 * brushSync가 켜져 있고 brushIndex 범위가 있으면 그 일자 구간으로,
 * 아니면 전체 기간으로 계산.
 * 분모는 raw 기록 수(일별 평균 아님).
 * 동적 간격(track_interval) 대응: 슬롯별 일별 {total,on,off} 행 배열을 직접 받는다.
 */
export function SlotOnOffRatio({ rows }: { rows: SlotDayStatRow[] }) {
  const { brushIndex, brushSync } = useRange();

  const { onPct, offPct, total } = useMemo(() => {
    if (!rows.length) return { onPct: 0, offPct: 0, total: 0 };
    let s = 0;
    let e = rows.length - 1;
    if (brushSync && brushIndex.startIndex != null && brushIndex.endIndex != null) {
      s = Math.max(0, brushIndex.startIndex);
      e = Math.min(rows.length - 1, brushIndex.endIndex);
    }
    let total = 0, on = 0, off = 0;
    for (let i = s; i <= e; i++) {
      const cell = rows[i];
      if (!cell) continue;
      total += cell.total;
      on += cell.on;
      off += cell.off;
    }
    if (!total) return { onPct: 0, offPct: 0, total: 0 };
    return {
      onPct: Math.round((on / total) * 100),
      offPct: Math.round((off / total) * 100),
      total,
    };
  }, [rows, brushSync, brushIndex.startIndex, brushIndex.endIndex]);

  if (!total) {
    return (
      <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
        {tr('ratio.noRecord')}
      </div>
    );
  }
  return (
    <div style={{ fontSize: 12, color: '#555', marginBottom: 6, fontWeight: 500, display: 'flex', gap: 16, alignItems: 'flex-start', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <span style={{ color: '#2e7d32', fontWeight: 700 }}>ON {onPct}%</span>
        <span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>{tr('ratio.onTitle')}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <span style={{ color: '#c62828', fontWeight: 700 }}>OFF {offPct}%</span>
        <span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>{tr('ratio.offTitle')}</span>
      </div>
    </div>
  );
}

export function OnOffLegend() {
  return (
    <p className="muted" style={{ marginTop: 6, marginBottom: 0, fontSize: 11, lineHeight: 1.5 }}>
      {tr('ratio.onNote')}<br />
      {tr('ratio.offNote')}
    </p>
  );
}
