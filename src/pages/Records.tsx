import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useRange } from '../context/RangeContext';
import {
  fetchExercise, fetchExerciseLogs, fetchMedicationChanges,
  fetchMedicationAdherenceDynamic, fetchMedicationAdherenceBySlot,
  fetchSymptomIntervalsDynamic, fetchSleep, fetchSleepScores,
  fetchConstipationCounts, sleepScoresToSingle, constipationToSingle, scoreRowsToSingle,
  intervalKey, intervalLabelFull,
  type MedChange, type ExerciseDetailLog,
  type SlotAdherence, type IntervalDynData, type SlotDayScoreRow,
} from '../lib/queries';
import { eachDay } from '../lib/dateRange';
import BarTrendChart from '../components/BarTrendChart';
import RangePicker from '../components/RangePicker';
import { RatioStrip, ConstipationLegend, computeConstipationAvgCycle } from '../components/RatioStrip';
import Skeleton from '../components/Skeleton';
import { useT } from '../i18n';

type RowMap = Record<string, any>;

export default function Records({ targetUserId }: { targetUserId?: string }) {
  const { t } = useT();
  const { range } = useRange();
  const [userId, setUserId] = useState<string | null>(targetUserId ?? null);
  const [name, setName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [med, setMed] = useState<RowMap[]>([]);
  const [medBySlot, setMedBySlot] = useState<SlotAdherence>({ slots: [], bySlot: {} });
  const [intervals, setIntervals] = useState<IntervalDynData>({ intervals: [], scores: {}, stats: {} });
  const [ex, setEx] = useState<RowMap[]>([]);
  const [sleep, setSleep] = useState<RowMap[]>([]);
  const [sleepBar, setSleepBar] = useState<RowMap[]>([]);
  const [consti, setConsti] = useState<RowMap[]>([]);
  const [changes, setChanges] = useState<MedChange[]>([]);
  const [exLogs, setExLogs] = useState<ExerciseDetailLog[]>([]);

  useEffect(() => {
    (async () => {
      if (!targetUserId) {
        const { data } = await supabase.auth.getUser();
        const uid = data.user?.id ?? null;
        if (uid) {
          const { data: row } = await supabase.from('users').select('name, role, patient_group_id').eq('id', uid).maybeSingle();
          // 보호자이면 같은 group의 환자 user_id로 자동 전환
          if (row?.role === 'caregiver' && row?.patient_group_id) {
            const { data: patientRow } = await supabase
              .from('patient_group_members')
              .select('user_id, users:user_id(name)')
              .eq('group_id', row.patient_group_id)
              .eq('role', 'patient')
              .maybeSingle();
            const patientId = (patientRow as any)?.user_id;
            const patientName = (patientRow as any)?.users?.name;
            if (patientId) {
              setUserId(patientId);
              if (patientName) setName(patientName);
              return;
            }
          }
          setUserId(uid);
          if (row?.name) setName(row.name);
        } else {
          setUserId(null);
        }
      } else {
        const { data: row } = await supabase.from('users').select('name').eq('id', targetUserId).maybeSingle();
        if (row?.name) setName(row.name);
      }
    })();
  }, [targetUserId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const days = eachDay(range.from, range.to);
      const [adh, mbs, ivd, exc, slp, slpScores, cst, ch, eLogs] = await Promise.all([
        fetchMedicationAdherenceDynamic(userId, range.from, range.to),
        fetchMedicationAdherenceBySlot(userId, range.from, range.to),
        fetchSymptomIntervalsDynamic(userId, range.from, range.to),
        fetchExercise(userId, range.from, range.to),
        fetchSleep(userId, range.from, range.to),
        fetchSleepScores(userId, range.from, range.to),
        fetchConstipationCounts(userId, range.from, range.to),
        fetchMedicationChanges(userId, range.from, range.to),
        fetchExerciseLogs(userId, range.from, range.to),
      ]);
      if (cancelled) return;
      setMed(days.map((d, i) => ({ date: d, adherence: adh[i]?.value ?? null })));
      setMedBySlot(mbs);
      setIntervals(ivd);
      setEx(days.map((d, i) => ({ date: d, minutes: exc[i]?.value ?? null })));
      setSleep(days.map((d, i) => ({ date: d, sleep: slp[i]?.value ?? null })));
      setSleepBar(sleepScoresToSingle(slpScores));
      setConsti(constipationToSingle(cst));
      setChanges(ch);
      setExLogs(eLogs);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId, range.from, range.to]);

  const title = useMemo(() => {
    if (targetUserId) return t('records.patientRecordsTitle', { name: name || t('records.patientFallback') });
    return name ? t('records.namedRecordsTitle', { name }) : t('records.myRecordsTitle');
  }, [targetUserId, name, t]);

  const averages = useMemo(() => {
    // 1. 약 복용률 전체 평균 (%)
    const adhVals = med.map((r) => r.adherence).filter((v) => v != null && !Number.isNaN(Number(v))) as number[];
    const adhAvg = adhVals.length ? Math.round(adhVals.reduce((a, b) => a + b, 0) / adhVals.length) : null;

    // 슬롯 stats/scores 합산 — 동적 간격(track_intervals) 전체 통합
    let bodyTotal = 0, bodyOn = 0, bodyOff = 0;
    let moodTotal = 0, moodOn = 0, moodOff = 0;
    let bodyScoreSum = 0, bodyScoreCnt = 0;
    let moodScoreSum = 0, moodScoreCnt = 0;
    for (const m of intervals.intervals) {
      const bStat = intervals.stats[intervalKey('body', m)] ?? [];
      const mStat = intervals.stats[intervalKey('mood', m)] ?? [];
      for (const r of bStat) { bodyTotal += r.total; bodyOn += r.on; bodyOff += r.off; }
      for (const r of mStat) { moodTotal += r.total; moodOn += r.on; moodOff += r.off; }
      const bSc = intervals.scores[intervalKey('body', m)] ?? [];
      const mSc = intervals.scores[intervalKey('mood', m)] ?? [];
      for (const r of bSc) { const c = r.counts as any; for (let i = 1; i <= 5; i++) { bodyScoreSum += i * c['c' + i]; bodyScoreCnt += c['c' + i]; } }
      for (const r of mSc) { const c = r.counts as any; for (let i = 1; i <= 5; i++) { moodScoreSum += i * c['c' + i]; moodScoreCnt += c['c' + i]; } }
    }
    const bodyAvg = bodyScoreCnt ? (bodyScoreSum / bodyScoreCnt).toFixed(1) : null;
    const moodAvg = moodScoreCnt ? (moodScoreSum / moodScoreCnt).toFixed(1) : null;

    const bodyOnPct = bodyTotal ? Math.round((bodyOn / bodyTotal) * 100) : null;
    const bodyOffPct = bodyTotal ? Math.round((bodyOff / bodyTotal) * 100) : null;
    const moodOnPct = moodTotal ? Math.round((moodOn / moodTotal) * 100) : null;
    const moodOffPct = moodTotal ? Math.round((moodOff / moodTotal) * 100) : null;

    // 8. 취침상태 평균 (점)
    const sleepVals = sleep.map((r) => r.sleep).filter((v) => v != null && !Number.isNaN(Number(v))) as number[];
    const sleepAvg = sleepVals.length ? (sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length).toFixed(1) : null;

    // 9. 변 본 날 평균 주기
    const cycle = computeConstipationAvgCycle(consti);

    // 10. 운동한 날 운동 횟수 평균 — exercise_logs row 수 / 운동한 날 수
    const exerciseDaysSet = new Set(exLogs.map((l) => l.date));
    const exerciseDaysCnt = exerciseDaysSet.size;
    const exerciseCountAvg = exerciseDaysCnt ? (exLogs.length / exerciseDaysCnt).toFixed(1) : null;

    // 11. 운동한 날 평균 운동 시간 (분)
    const minutesByDay: Record<string, number> = {};
    for (const l of exLogs) { minutesByDay[l.date] = (minutesByDay[l.date] ?? 0) + l.minutes; }
    const minVals = Object.values(minutesByDay);
    const exerciseMinAvg = minVals.length ? Math.round(minVals.reduce((a, b) => a + b, 0) / minVals.length) : null;

    const pct = (v: number | null) => (v == null ? '-' : `${v}%`);
    const pts = (v: string | number | null) => (v == null ? '-' : t('records.ptsValue', { n: v }));
    const days = (v: number | null) => (v == null ? '-' : t('records.daysValue', { n: v }));
    const times = (v: string | number | null) => (v == null ? '-' : t('records.timesValue', { n: v }));
    const mins = (v: number | null) => (v == null ? '-' : t('records.minsValue', { n: v }));

    return [
      { label: t('records.avgMedRate'), value: pct(adhAvg) },
      { label: t('records.avgBodyState'), value: pts(bodyAvg) },
      { label: t('records.avgBodyStateOn'), value: pct(bodyOnPct) },
      { label: t('records.avgBodyStateOff'), value: pct(bodyOffPct) },
      { label: t('records.avgMood'), value: pts(moodAvg) },
      { label: t('records.avgMoodOn'), value: pct(moodOnPct) },
      { label: t('records.avgMoodOff'), value: pct(moodOffPct) },
      { label: t('records.avgSleep'), value: pts(sleepAvg) },
      { label: t('records.avgBowelCycle'), value: days(cycle) },
      { label: t('records.avgDailyExerciseCount'), value: times(exerciseCountAvg) },
      { label: t('records.avgDailyExerciseTime'), value: mins(exerciseMinAvg) },
    ];
  }, [med, intervals, sleep, consti, exLogs, t]);

  return (
    <div className="page-foot">
      <RangePicker title={title} downloadHref="/records/export" averages={averages} />

      {loading && <Skeleton count={4} />}

      <div className="section-title">{t('records.medicationRate')}</div>
      <div className="card">
        <BarTrendChart
          mode="single"
          data={med}
          series={{ key: 'adherence', name: t('records.adherenceRate'), color: '#4CAF50' }}
          yDomain={[0, 100]}
          yTicks={[0, 25, 50, 75, 100]}
          yUnit="%"
          refLines={changes}
        />
      </div>

      {/* 복용 시점(활성 dose_slot)별 — 커스텀 슬롯 포함, time 오름차순 */}
      {medBySlot.slots.map((s) => (
        <div key={`med-${s.key}`}>
          <div className="section-title">{t('records.medicationRateForSlot', { slot: s.label })}</div>
          <div className="card">
            <BarTrendChart
              mode="single"
              data={(medBySlot.bySlot[s.key] ?? []).map((p) => ({ date: p.date, adherence: p.value }))}
              series={{ key: 'adherence', name: t('records.slotAdherenceRate', { slot: s.label }), color: '#C8E6C9' }}
              height={140}
              yDomain={[0, 100]}
              yTicks={[0, 25, 50, 75, 100]}
              yUnit="%"
            />
          </div>
        </div>
      ))}

      {/* 몸 상태 / 기분 상태 — 동적 track_interval 별 */}
      {(['body', 'mood'] as const).flatMap((field) =>
        intervals.intervals.map((m) => {
          const k = intervalKey(field, m);
          const rows: SlotDayScoreRow[] = intervals.scores[k] ?? [];
          const barRows = scoreRowsToSingle(rows);
          return (
            <div key={k}>
              <div className="section-title">{intervalLabelFull(field, m)}</div>
              <div className="card">
                <RatioStrip rows={rows} />
                <BarTrendChart
                  mode="single"
                  data={barRows}
                  series={{ key: 'score', name: t('records.score'), color: '#4CAF50' }}
                  yDomain={[0, 5]}
                  yTicks={[0, 1, 2, 3, 4, 5]}
                />
              </div>
            </div>
          );
        })
      )}

      <div className="section-title">{t('records.exercise')}</div>
      <div className="card">
        <BarTrendChart
          mode="single"
          data={ex}
          series={{ key: 'minutes', name: t('records.exerciseTime'), color: '#4CAF50' }}
          yDomain={[0, 180]}
          yTicks={[0, 30, 60, 90, 120, 150, 180]}
          yUnit={t('records.minUnit')}
        />
      </div>

      <div className="section-title">{t('records.sleep')}</div>
      <div className="card">
        <BarTrendChart
          mode="single"
          data={sleepBar}
          series={{ key: 'score', name: t('records.sleepScore'), color: '#4CAF50' }}
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
          series={{ key: 'value', name: t('records.bowelMovement'), color: '#4CAF50' }}
          yDomain={[0, 2]}
          yTicks={[0, 1, 2]}
          noTrendline
        />
      </div>
    </div>
  );
}

// keep Link import used elsewhere
void Link;
