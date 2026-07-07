import { useEffect, useMemo, useState } from 'react';
import { useRange } from '../context/RangeContext';
import { usePatientId } from '../lib/usePatientId';
import {
  fetchSleep, fetchSleepScores, fetchConstipationCounts,
  sleepScoresToSingle, constipationToSingle,
} from '../lib/queries';
import BarTrendChart from '../components/BarTrendChart';
import RangePicker from '../components/RangePicker';
import { ConstipationLegend, computeConstipationAvgCycle } from '../components/RatioStrip';
import { useT } from '../i18n';

function avgKey(rows: Record<string, any>[], key: string, digits = 1): string {
  const vals = rows.map((r) => r[key]).filter((v) => v != null && !Number.isNaN(Number(v))) as number[];
  if (!vals.length) return '-';
  const v = vals.reduce((a, b) => a + b, 0) / vals.length;
  return v.toFixed(digits);
}

export default function SleepConstipation() {
  const { t } = useT();
  const { range } = useRange();
  const { patientId } = usePatientId();
  const [sleep, setSleep] = useState<Record<string, any>[]>([]);
  const [sleepBar, setSleepBar] = useState<Record<string, any>[]>([]);
  const [consti, setConsti] = useState<Record<string, any>[]>([]);

  useEffect(() => {
    (async () => {
      if (!patientId) return;
      const [slp, slpSc, cst] = await Promise.all([
        fetchSleep(patientId, range.from, range.to),
        fetchSleepScores(patientId, range.from, range.to),
        fetchConstipationCounts(patientId, range.from, range.to),
      ]);
      setSleep(slp.map((p) => ({ date: p.date, sleep: p.value })));
      setSleepBar(sleepScoresToSingle(slpSc));
      setConsti(constipationToSingle(cst));
    })();
  }, [patientId, range.from, range.to]);

  const averages = useMemo(() => {
    const cycle = computeConstipationAvgCycle(consti);
    return [
      { label: t('sleepConstipation.avgSleep'), value: avgKey(sleep, 'sleep') },
      { label: t('records.avgBowelCycle'), value: cycle != null ? t('records.daysValue', { n: cycle.toFixed(1) }) : '-' },
    ];
  }, [sleep, consti, t]);

  return (
    <div className="page-foot">
      <RangePicker title={t('sleepConstipation.pageTitle')} averages={averages} />

      <div className="section-title">{t('records.sleep')}</div>
      <div className="card">
        <BarTrendChart
          mode="single"
          data={sleepBar}
          series={{ key: 'score', name: t('records.sleepScore'), color: '#C8E6C9' }}
          yDomain={[0, 5]}
          yTicks={[0, 1, 2, 3, 4, 5]}
        />
      </div>

      <div className="section-title">{t('records.constipation')}</div>
      <div className="card">
        <ConstipationLegend avgCycleDays={computeConstipationAvgCycle(consti)} />
        <BarTrendChart
          mode="single"
          data={consti}
          series={{ key: 'value', name: t('records.bowelMovement'), color: '#C8E6C9' }}
          yDomain={[0, 2]}
          yTicks={[0, 1, 2]}
          noTrendline
        />
      </div>
    </div>
  );
}
