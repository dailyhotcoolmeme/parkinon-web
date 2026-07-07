import { useEffect, useMemo, useState } from 'react';
import { useRange } from '../context/RangeContext';
import { usePatientId } from '../lib/usePatientId';
import {
  fetchExercise,
  fetchExerciseLogs,
  fetchExerciseByType,
  exerciseTypeId,
  exerciseTypeLabel,
  EXERCISE_TYPE_ORDER,
  type ExerciseDetailLog,
  type DailyPoint,
} from '../lib/queries';
import { eachDay } from '../lib/dateRange';
import BarTrendChart from '../components/BarTrendChart';
import RangePicker from '../components/RangePicker';
import { useT } from '../i18n';

// raw(한글/영문 어느 쪽으로 저장돼 있든) → 안정 그룹 키. 사전 정의 종류가 아니면
// raw 원문 자체를 키로 써서 커스텀 입력도 자기 칸으로 묶는다(표시는 그대로 raw).
function groupKey(raw: string): string {
  return exerciseTypeId(raw) ?? raw ?? 'custom';
}
// 그룹 키 → 현재 로케일 표시 라벨.
function groupLabel(key: string, t: (k: string, p?: Record<string, string | number>) => string): string {
  if (EXERCISE_TYPE_ORDER.includes(key)) return exerciseTypeLabel(key);
  if (key === 'custom' || !key) return t('exerciseDetail.other');
  return key; // 커스텀 직접입력 원문
}

export default function ExerciseDetail() {
  const { t } = useT();
  const { range } = useRange();
  const { patientId } = usePatientId();
  const [rows, setRows] = useState<any[]>([]);
  const [logs, setLogs] = useState<ExerciseDetailLog[]>([]);
  const [byType, setByType] = useState<Record<string, DailyPoint[]>>({});

  useEffect(() => {
    (async () => {
      if (!patientId) return;
      const [ex, ls, bt] = await Promise.all([
        fetchExercise(patientId, range.from, range.to),
        fetchExerciseLogs(patientId, range.from, range.to),
        fetchExerciseByType(patientId, range.from, range.to),
      ]);
      const days = eachDay(range.from, range.to);
      setRows(days.map((d, i) => ({ date: d, minutes: ex[i]?.value ?? null })));
      setLogs(ls);
      setByType(bt);
    })();
  }, [patientId, range.from, range.to]);

  const logsByDate = useMemo(() => {
    const map: Record<string, ExerciseDetailLog[]> = {};
    for (const l of logs) {
      if (!map[l.date]) map[l.date] = [];
      map[l.date].push(l);
    }
    return map;
  }, [logs]);

  const totalMin = useMemo(() => logs.reduce((a, b) => a + b.minutes, 0), [logs]);
  const activeDays = useMemo(() => Object.values(logsByDate).filter((arr) => arr.length).length, [logsByDate]);
  const avg = activeDays ? Math.round(totalMin / activeDays) : 0;

  // 종류별 안정 키로 합산(영문/한글 어느 쪽으로 저장돼 있어도 같은 종류로 묶임)
  const minutesByKey = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of logs) {
      const key = groupKey(l.type);
      m[key] = (m[key] ?? 0) + l.minutes;
    }
    return m;
  }, [logs]);

  const topTypeKey = useMemo(() => {
    const entries = Object.entries(minutesByKey);
    if (!entries.length) return null;
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0];
  }, [minutesByKey]);

  // 종류별 일별 시리즈 (안정 키 기준으로 병합)
  const seriesByKey = useMemo(() => {
    const merged: Record<string, DailyPoint[]> = {};
    const days = eachDay(range.from, range.to);
    for (const rawType of Object.keys(byType)) {
      const key = groupKey(rawType);
      const src = byType[rawType];
      if (!merged[key]) {
        merged[key] = days.map((d) => ({ date: d, value: null as number | null }));
      }
      merged[key] = merged[key].map((p, i) => {
        const v = src[i]?.value;
        if (v == null) return p;
        return { date: p.date, value: (p.value ?? 0) + v };
      });
    }
    return merged;
  }, [byType, range.from, range.to]);

  const orderedTypes = useMemo(() => {
    const have = Object.keys(seriesByKey).filter((k) =>
      seriesByKey[k].some((p) => p.value != null && p.value > 0),
    );
    const known = EXERCISE_TYPE_ORDER.filter((k) => have.includes(k));
    const extra = have.filter((k) => !EXERCISE_TYPE_ORDER.includes(k));
    return [...known, ...extra];
  }, [seriesByKey]);

  const averages = [
    { label: t('exerciseDetail.totalTime'), value: t('records.minsValue', { n: totalMin }) },
    { label: t('exerciseDetail.activeDays'), value: t('records.daysValue', { n: activeDays }) },
    { label: t('exerciseDetail.avgOnActiveDay'), value: t('records.minsValue', { n: avg }) },
    ...(topTypeKey ? [{ label: t('exerciseDetail.topExercise'), value: groupLabel(topTypeKey, t) }] : []),
  ];

  return (
    <div className="page-foot">
      <RangePicker title={t('exerciseDetail.pageTitle')} averages={averages} />
      <div className="section-title">{t('exerciseDetail.overallSection')}</div>
      <div className="card">
        <BarTrendChart
          mode="single"
          data={rows}
          series={{ key: 'minutes', name: t('records.exerciseTime'), color: '#4CAF50' }}
          yDomain={[0, 180]}
          yTicks={[0, 30, 60, 90, 120, 150, 180]}
          yUnit={t('records.minUnit')}
        />
      </div>

      {orderedTypes.map((key) => {
        const label = groupLabel(key, t);
        const data = seriesByKey[key].map((p) => ({ date: p.date, minutes: p.value }));
        return (
          <div key={key}>
            <div className="section-title">{label}</div>
            <div className="card">
              <BarTrendChart
                mode="single"
                data={data}
                series={{ key: 'minutes', name: t('exerciseDetail.typeTime', { type: label }), color: '#C8E6C9' }}
                height={140}
                yDomain={[0, 180]}
                yTicks={[0, 30, 60, 90, 120, 150, 180]}
                yUnit={t('records.minUnit')}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
