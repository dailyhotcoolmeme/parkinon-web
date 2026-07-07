import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useRange } from '../context/RangeContext';
import { usePatientId } from '../lib/usePatientId';
import {
  fetchSymptomIntervalsDynamic,
  fetchTapTrend, fetchReactionTrend,
  scoreRowsToSingle, intervalKey, intervalLabelFull, formatIntervalLabel,
  type IntervalDynData, type SlotDayScoreRow,
  type DailyPoint,
} from '../lib/queries';
import BarTrendChart, { SCORE_COLORS } from '../components/BarTrendChart';
import RangePicker from '../components/RangePicker';
import { RatioStrip } from '../components/RatioStrip';
import { MEASUREMENT_FEATURE_ENABLED } from '../lib/featureFlags';
import { useT } from '../i18n';

/**
 * 반응속도(ms) → "0.32초 (320ms)" 형식 (앱/PDF와 일관).
 * PdfMeasurementChart 동일 규칙.
 */
function formatReactionMs(ms: number): string {
  const rounded = Math.round(ms);
  const seconds = (rounded / 1000).toFixed(2);
  return `${seconds}초 (${rounded}ms)`;
}

/** non-null value 평균 (정수 반올림). 데이터 없으면 null */
function meanValue(rows: DailyPoint[]): number | null {
  const vals = rows
    .map((r) => r.value)
    .filter((v): v is number => v != null && !Number.isNaN(Number(v)));
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export default function SymptomDetail() {
  const { t } = useT();
  const { range } = useRange();
  const { patientId } = usePatientId();
  const [intervals, setIntervals] = useState<IntervalDynData>({ intervals: [], scores: {}, stats: {} });
  const [tapTrend, setTapTrend] = useState<DailyPoint[]>([]);
  const [rtTrend, setRtTrend] = useState<DailyPoint[]>([]);

  // RangePicker 선택 기간(일수) — 다른 차트는 from/to 자체를 쓰지만 측정 trend는 days 기반 API
  const rangeDays = Math.max(1, dayjs(range.to).diff(range.from, 'day') + 1);

  useEffect(() => {
    (async () => {
      if (!patientId) return;
      const [ivd, tap, rt] = await Promise.all([
        fetchSymptomIntervalsDynamic(patientId, range.from, range.to),
        fetchTapTrend(patientId, rangeDays),
        fetchReactionTrend(patientId, rangeDays),
      ]);
      setIntervals(ivd);
      setTapTrend(tap);
      setRtTrend(rt);
    })();
  }, [patientId, range.from, range.to, rangeDays]);

  // 간격별 점수 평균(점) — scores 의 c1~c5 가중평균
  const avgScore = (rows: SlotDayScoreRow[]): string => {
    let sum = 0, cnt = 0;
    for (const r of rows) { const c = r.counts as any; for (let i = 1; i <= 5; i++) { sum += i * c['c' + i]; cnt += c['c' + i]; } }
    return cnt ? (sum / cnt).toFixed(1) : '-';
  };

  const averages = useMemo(() =>
    intervals.intervals.map((m) => ({
      label: t('symptomDetail.avgForInterval', { interval: formatIntervalLabel(m) }),
      value: avgScore(intervals.scores[intervalKey('body', m)] ?? []),
    })),
  [intervals, t]);

  // ── 컨디션 측정 요약 (선택 기간 평균) ──
  const tapHasAny = useMemo(() => tapTrend.some((r) => r.value != null), [tapTrend]);
  const rtHasAny = useMemo(() => rtTrend.some((r) => r.value != null), [rtTrend]);

  // 선택 기간(rangeDays) 동일 데이터 배열의 non-null 평균 (정수 반올림)
  const tapRangeMean = useMemo(() => meanValue(tapTrend), [tapTrend]);
  const rtRangeMean = useMemo(() => meanValue(rtTrend), [rtTrend]);

  // Y축 도메인 — 데이터 기준
  const tapDomainMax = useMemo(() => {
    const vals = tapTrend.map((r) => r.value).filter((v): v is number => v != null);
    const m = vals.length ? Math.max(...vals) : 0;
    return Math.max(10, Math.ceil((m * 1.2) / 10) * 10);
  }, [tapTrend]);

  const rtDomainMax = useMemo(() => {
    const vals = rtTrend.map((r) => r.value).filter((v): v is number => v != null);
    const m = vals.length ? Math.max(...vals) : 0;
    return Math.max(500, Math.ceil((m * 1.2) / 100) * 100);
  }, [rtTrend]);

  // 탭핑 요약 카피 — "평균 47회" (N일 표기 제거, 차트 위 라벨과의 중복 제거)
  const tapSummary = (() => {
    if (!tapHasAny || tapRangeMean == null) return '기록 없음';
    return `평균 ${tapRangeMean}회`;
  })();

  // 반응속도 요약 카피 — "평균 0.32초 (320ms)"
  const rtSummary = (() => {
    if (!rtHasAny || rtRangeMean == null) return '기록 없음';
    return `평균 ${formatReactionMs(rtRangeMean)}`;
  })();

  // 평균 강조 박스 스타일 — RatioStrip ON 박스와 글자색·높이까지 완전 동일.
  // RatioStrip ON 박스(span): color SCORE_COLORS[5](#4CAF50), fontWeight 700,
  //   background '#E8F5E9', padding '2px 8px', borderRadius 6.
  //   부모 div는 fontSize 13, color '#555'(상속). span에 lineHeight 미명시 → normal.
  // 부모 fontSize 영향 차단 위해 박스 자체에 fontSize 13, lineHeight 'normal' 명시.
  const meanBoxStyle: React.CSSProperties = {
    display: 'inline-block',
    background: '#E8F5E9',
    color: SCORE_COLORS[5],
    fontWeight: 700,
    fontSize: 13,
    lineHeight: 'normal',
    padding: '2px 8px',
    borderRadius: 6,
    marginBottom: 10,
  };

  // 컨디션 측정 기능 숨김 시(출시 전) 측정 차트 섹션 비노출.
  const hasMeasurementAny = MEASUREMENT_FEATURE_ENABLED && (tapHasAny || rtHasAny);

  return (
    <div className="page-foot">
      <RangePicker title={t('symptomDetail.pageTitle')} averages={averages} />
      {intervals.intervals.map((m) => {
        const k = intervalKey('body', m);
        const rows = intervals.scores[k] ?? [];
        return (
          <div key={k}>
            <div className="section-title">{intervalLabelFull('body', m)}</div>
            <div className="card">
              <RatioStrip rows={rows} />
              <BarTrendChart
                mode="single"
                data={scoreRowsToSingle(rows)}
                series={{ key: 'score', name: t('records.score'), color: '#2E7D32' }}
                yDomain={[0, 5]}
                yTicks={[0, 1, 2, 3, 4, 5]}
              />
            </div>
          </div>
        );
      })}

      {/* ── 컨디션 측정 (손가락 두드리기 · 반응속도, RangePicker 기간 연동) ── */}
      {hasMeasurementAny && (
        <div>
          {tapHasAny && (
            <div>
              <div className="section-title">컨디션 측정: 손가락 두드리기</div>
              <div className="card" style={{ marginBottom: 12 }}>
              {tapRangeMean != null ? (
                <div style={meanBoxStyle}>{tapSummary}</div>
              ) : (
                <div style={{ fontSize: 14, color: '#555', marginBottom: 10 }}>
                  {tapSummary}
                </div>
              )}
              <BarTrendChart
                mode="single"
                data={tapTrend}
                series={{ key: 'value', name: '탭 횟수', color: '#F57C00' }}
                yDomain={[0, tapDomainMax]}
                yUnit="회"
                noTrendline
              />
              </div>
            </div>
          )}

          {rtHasAny && (
            <div>
              <div className="section-title">컨디션 측정: 반응속도</div>
              <div className="card">
              {rtRangeMean != null ? (
                <div style={meanBoxStyle}>{rtSummary}</div>
              ) : (
                <div style={{ fontSize: 14, color: '#555', marginBottom: 10 }}>
                  {rtSummary}
                </div>
              )}
              <BarTrendChart
                mode="single"
                data={rtTrend}
                series={{ key: 'value', name: '반응시간', color: '#F57C00' }}
                yDomain={[0, rtDomainMax]}
                yUnit="ms"
                noTrendline
              />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
