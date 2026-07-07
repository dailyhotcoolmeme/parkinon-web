import { useEffect, useMemo, useState } from 'react';
import { useRange } from '../context/RangeContext';
import { usePatientId } from '../lib/usePatientId';
import {
  fetchSymptomIntervalsDynamic,
  scoreRowsToSingle, intervalKey, intervalLabelFull, formatIntervalLabel,
  type IntervalDynData, type SlotDayScoreRow,
} from '../lib/queries';
import BarTrendChart from '../components/BarTrendChart';
import RangePicker from '../components/RangePicker';
import { RatioStrip } from '../components/RatioStrip';
import { useT } from '../i18n';

export default function MoodDetail() {
  const { t } = useT();
  const { range } = useRange();
  const { patientId } = usePatientId();
  const [intervals, setIntervals] = useState<IntervalDynData>({ intervals: [], scores: {}, stats: {} });

  useEffect(() => {
    (async () => {
      if (!patientId) return;
      const ivd = await fetchSymptomIntervalsDynamic(patientId, range.from, range.to);
      setIntervals(ivd);
    })();
  }, [patientId, range.from, range.to]);

  const avgScore = (rows: SlotDayScoreRow[]): string => {
    let sum = 0, cnt = 0;
    for (const r of rows) { const c = r.counts as any; for (let i = 1; i <= 5; i++) { sum += i * c['c' + i]; cnt += c['c' + i]; } }
    return cnt ? (sum / cnt).toFixed(1) : '-';
  };

  const averages = useMemo(() =>
    intervals.intervals.map((m) => ({
      label: t('moodDetail.avgForInterval', { interval: formatIntervalLabel(m) }),
      value: avgScore(intervals.scores[intervalKey('mood', m)] ?? []),
    })),
  [intervals, t]);

  return (
    <div className="page-foot">
      <RangePicker title={t('moodDetail.pageTitle')} averages={averages} />
      {intervals.intervals.map((m) => {
        const k = intervalKey('mood', m);
        const rows = intervals.scores[k] ?? [];
        return (
          <div key={k}>
            <div className="section-title">{intervalLabelFull('mood', m)}</div>
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
    </div>
  );
}
