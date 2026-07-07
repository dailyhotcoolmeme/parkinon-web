import { useMemo } from 'react';
import { useRange } from '../context/RangeContext';
import { SCORE_COLORS, getScoreLabel } from './BarTrendChart';
import type { ScoreCounts, SlotDayScoreRow } from '../lib/queries';
import { useT } from '../i18n';

/**
 * Bearable 스타일 5색 가로 비율 바 + 점수별 카운트 뱃지.
 * brushSync가 켜져 있고 brushIndex 범위가 있으면 그 구간으로, 아니면 전체 기간.
 * 동적 간격(track_intervals) 대응: 슬롯별 일별 ScoreCounts 행 배열을 직접 받는다.
 */
export function RatioStrip({ rows }: { rows: SlotDayScoreRow[] }) {
  const { t } = useT();
  const { brushIndex, brushSync } = useRange();

  const { total, onPct, offPct } = useMemo(() => {
    const sum: ScoreCounts = { c1: 0, c2: 0, c3: 0, c4: 0, c5: 0 };
    if (!rows.length) return { total: 0, onPct: 0, offPct: 0 };
    let s = 0;
    let e = rows.length - 1;
    if (brushSync && brushIndex.startIndex != null && brushIndex.endIndex != null) {
      s = Math.max(0, brushIndex.startIndex);
      e = Math.min(rows.length - 1, brushIndex.endIndex);
    }
    for (let i = s; i <= e; i++) {
      const c = rows[i]?.counts;
      if (!c) continue;
      sum.c1 += c.c1; sum.c2 += c.c2; sum.c3 += c.c3; sum.c4 += c.c4; sum.c5 += c.c5;
    }
    const total = sum.c1 + sum.c2 + sum.c3 + sum.c4 + sum.c5;
    const on = sum.c4 + sum.c5;
    const off = sum.c1 + sum.c2;
    return {
      total,
      onPct: total ? Math.round((on / total) * 100) : 0,
      offPct: total ? Math.round((off / total) * 100) : 0,
    };
  }, [rows, brushSync, brushIndex.startIndex, brushIndex.endIndex]);

  if (!total) {
    return <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>{t('ratioStrip.noRecords')}</div>;
  }

  return (
    <div style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', gap: 16, fontSize: 13, color: '#555', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <span style={{ color: SCORE_COLORS[5], fontWeight: 700, background: '#E8F5E9', padding: '2px 8px', borderRadius: 6 }}>ON {onPct}%</span>
        <span style={{ fontSize: 12, color: '#888' }}>{t('ratioStrip.onDesc')}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <span style={{ color: SCORE_COLORS[1], fontWeight: 700, background: '#FBEAEC', padding: '2px 8px', borderRadius: 6 }}>OFF {offPct}%</span>
        <span style={{ fontSize: 12, color: '#888' }}>{t('ratioStrip.offDesc')}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <span style={{ color: '#888' }}>{t('ratioStrip.totalCount', { n: total })}</span>
      </div>
    </div>
  );
}

export function ConstipationLegend({ avgCycleDays }: { avgCycleDays?: number | null } = {}) {
  const { t } = useT();
  return (
    <div style={{ marginBottom: 12, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', gap: 16, fontSize: 13, color: '#555', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#4CAF50', fontWeight: 700 }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 5, background: '#C8E6C9' }} />
          {t('ratioStrip.hadBowelMovement')}
        </span>
        <span style={{ fontSize: 12, color: '#888' }}>{t('ratioStrip.barScore2')}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#4CAF50', fontWeight: 700 }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 5, background: '#C8E6C9' }} />
          {t('ratioStrip.noBowelMovement')}
        </span>
        <span style={{ fontSize: 12, color: '#888' }}>{t('ratioStrip.barScore1')}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#4CAF50', fontWeight: 700 }}>
          {t('ratioStrip.avgCycle')}
        </span>
        <span style={{ fontSize: 12, color: '#888' }}>
          {avgCycleDays != null ? t('records.daysValue', { n: avgCycleDays.toFixed(1) }) : '-'}
        </span>
      </div>
    </div>
  );
}

/** 변 본 날 사이의 평균 간격(일). 데이터 부족(<2회)이면 null. */
export function computeConstipationAvgCycle(data: Record<string, any>[]): number | null {
  const days = data.filter((d: any) => Number(d.value) === 2).map((d: any) => d.date as string).sort();
  if (days.length < 2) return null;
  let totalGap = 0;
  for (let i = 1; i < days.length; i++) {
    const a = new Date(days[i - 1]).getTime();
    const b = new Date(days[i]).getTime();
    totalGap += (b - a) / 86400000;
  }
  return Math.round((totalGap / (days.length - 1)) * 10) / 10;
}

export function ScoreLegend() {
  const { t, lang } = useT();
  const scoreLabel = useMemo(() => getScoreLabel(), [lang]);
  return (
    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11, color: '#777', justifyContent: 'flex-start' }}>
      {([1, 2, 3, 4, 5] as const).map((s) => (
        <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 5, background: SCORE_COLORS[s] }} />
          {t('records.ptsValue', { n: s })} {scoreLabel[s]}
        </span>
      ))}
    </div>
  );
}
