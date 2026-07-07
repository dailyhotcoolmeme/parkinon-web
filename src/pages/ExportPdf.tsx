import { useEffect, useState } from 'react';
import { useRange } from '../context/RangeContext';
import { usePatientId } from '../lib/usePatientId';
import {
  fetchExercise, fetchMedicationChanges,
  fetchMedicationAdherenceDynamic, fetchMedicationAdherenceBySlot,
  fetchSymptomIntervalsDynamic,
  fetchSleepScores, fetchConstipationCounts,
  fetchSleep, fetchExerciseLogs,
  fetchTapTrend, fetchReactionTrend, fetchMeasurementBaselines,
  sleepScoresToSingle, constipationToSingle, scoreRowsToSingle,
  intervalKey, intervalLabelFull,
  type MedChange, type ScoreCounts,
  type ExerciseDetailLog, type SlotDayScoreRow,
  type DailyPoint, type MeasurementBaselines,
  type IntervalDynData, type SlotAdherence,
} from '../lib/queries';
import { computeConstipationAvgCycle } from '../components/RatioStrip';
import { eachDay } from '../lib/dateRange';
import RangePicker from '../components/RangePicker';
import dayjs from 'dayjs';
import { pdf } from '@react-pdf/renderer';
import {
  RecordsPdf, recordsPdfFileName, type RecordsPdfProps,
  type PdfSectionKey, PDF_SECTION_ORDER, PDF_SECTION_LABELS,
  MEASUREMENT_CHART_KEYS, type MeasurementSectionData,
  type PdfIntervalSpec, type PdfMedSlotSpec,
} from '../pdf/RecordsPdf';
import { ChartCapture, type AnyCaptureSpec } from '../pdf/ChartCapture';
import type { PdfChartSpec } from '../pdf/PdfPrintChart';
import { MEASUREMENT_FEATURE_ENABLED } from '../lib/featureFlags';
import BrandProgressOverlay, { type ProgressStep } from '../components/BrandProgressOverlay';
import { useT } from '../i18n';

// 컨디션 측정 기능 숨김 시(출시 전) PDF 내보내기 체크리스트에서도 측정 항목 제외.
const SECTION_KEYS = MEASUREMENT_FEATURE_ENABLED
  ? PDF_SECTION_ORDER
  : PDF_SECTION_ORDER.filter((k) => k !== 'measurement');

/**
 * 차트 spec key → 어느 섹션에 속하는지 매핑 (onoff 는 차트 없음 → 캡처 불필요).
 * 동적 키 규칙: 'med:<slotId>' → medication, 'body|<min>' → body, 'mood|<min>' → mood.
 */
function specKeyToSection(key: string): PdfSectionKey | null {
  if (key === 'medication' || key.startsWith('med:')) return 'medication';
  if (key.startsWith('body|')) return 'body';
  if (key.startsWith('mood|')) return 'mood';
  if (key === MEASUREMENT_CHART_KEYS.tap || key === MEASUREMENT_CHART_KEYS.reaction) return 'measurement';
  if (key === 'sleep') return 'sleep';
  if (key === 'constipation') return 'constipation';
  if (key === 'exercise') return 'exercise';
  return null;
}

/** 60대+ 대응 큰 체크 표시 */
function CheckMark({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        width: 28, height: 28, flexShrink: 0,
        borderRadius: 8,
        border: on ? '2px solid #4CAF50' : '2px solid #C7CDD4',
        background: on ? '#4CAF50' : '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {on && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </span>
  );
}

type AvgItem = { label: string; value: string };

type LoadedData = {
  name: string;
  from: string;
  to: string;
  bodyIntervals: PdfIntervalSpec[];
  moodIntervals: PdfIntervalSpec[];
  medSlots: PdfMedSlotSpec[];
  medChanges: MedChange[];
  specs: AnyCaptureSpec[];
  averages: AvgItem[];
  constipationAvgCycle: number | null;
  measurement?: MeasurementSectionData;
  /** 측정 데이터 0건이면 체크박스 항목 회색 비활성 */
  hasMeasurementData: boolean;
};

/** 간격별 일별 ScoreCounts 행 배열 → 전체 합산 ScoreCounts */
function aggCounts(rows: SlotDayScoreRow[]): ScoreCounts {
  const out: ScoreCounts = { c1: 0, c2: 0, c3: 0, c4: 0, c5: 0 };
  for (const r of rows) {
    const c = r.counts;
    out.c1 += c.c1; out.c2 += c.c2; out.c3 += c.c3; out.c4 += c.c4; out.c5 += c.c5;
  }
  return out;
}

/** Records.tsx 의 averages useMemo 와 100% 동일한 계산 (화면 "요약"과 동일 문구·수치·형식) */
function computeAverages(
  med: { adherence: number | null }[],
  intervals: IntervalDynData,
  sleep: { sleep: number | null }[],
  consti: { date: string; value: number | null }[],
  exLogs: ExerciseDetailLog[],
  t: (key: string, params?: Record<string, string | number>) => string,
): AvgItem[] {
  const adhVals = med.map((r) => r.adherence).filter((v) => v != null && !Number.isNaN(Number(v))) as number[];
  const adhAvg = adhVals.length ? Math.round(adhVals.reduce((a, b) => a + b, 0) / adhVals.length) : null;

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

  const sleepVals = sleep.map((r) => r.sleep).filter((v) => v != null && !Number.isNaN(Number(v))) as number[];
  const sleepAvg = sleepVals.length ? (sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length).toFixed(1) : null;

  const cycle = computeConstipationAvgCycle(consti as Record<string, any>[]);

  const exerciseDaysSet = new Set(exLogs.map((l) => l.date));
  const exerciseDaysCnt = exerciseDaysSet.size;
  const exerciseCountAvg = exerciseDaysCnt ? (exLogs.length / exerciseDaysCnt).toFixed(1) : null;

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
}

export default function ExportPdf() {
  const { t } = useT();
  /** PDF 만들기 3단계 스텝 (스펙 W1) */
  const PDF_STEPS: ProgressStep[] = [
    { key: 'fetch', label: t('exportPdf.stepFetch') },
    { key: 'chart', label: t('exportPdf.stepChart') },
    { key: 'pdf', label: t('exportPdf.stepPdf') },
  ];
  const { range, showTrendline } = useRange();
  const { patientId, patientName } = usePatientId();
  const [name, setName] = useState('');
  const [data, setData] = useState<LoadedData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [captureSpecs, setCaptureSpecs] = useState<AnyCaptureSpec[] | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [lastFileName, setLastFileName] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // W1 진행 오버레이 단계: 'fetch'=①데이터 모으기, 'chart'=②그래프 그리기,
  //                        'pdf'=③PDF 만들기, 'done'=완료, null=숨김
  const [pdfPhase, setPdfPhase] = useState<'fetch' | 'chart' | 'pdf' | 'done' | null>(null);
  // 기본값: 전체 선택 (현행과 동일 결과 보장)
  const [selected, setSelected] = useState<Set<PdfSectionKey>>(
    () => new Set(SECTION_KEYS),
  );

  const selectedCount = selected.size;
  const allSelected = selectedCount === SECTION_KEYS.length;

  const toggleSection = (k: PdfSectionKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(SECTION_KEYS));
  };

  useEffect(() => {
    (async () => {
      if (!patientId) return;
      setLoading(true);
      try {
        const nm = patientName || '';
        setName(nm);
        const days = eachDay(range.from, range.to);
        const [adh, mbs, ivd, exc, slpSc, cst, ch, slp, eLogs, tapTrend, rtTrend, mBaselines] = await Promise.all([
          fetchMedicationAdherenceDynamic(patientId, range.from, range.to),
          fetchMedicationAdherenceBySlot(patientId, range.from, range.to),
          fetchSymptomIntervalsDynamic(patientId, range.from, range.to),
          fetchExercise(patientId, range.from, range.to),
          fetchSleepScores(patientId, range.from, range.to),
          fetchConstipationCounts(patientId, range.from, range.to),
          fetchMedicationChanges(patientId, range.from, range.to),
          fetchSleep(patientId, range.from, range.to),
          fetchExerciseLogs(patientId, range.from, range.to),
          // 측정 데이터(최근 30일 고정 — 기간 선택과 별개로 §6.2 30일 rolling baseline 정책 반영)
          fetchTapTrend(patientId, 30),
          fetchReactionTrend(patientId, 30),
          fetchMeasurementBaselines(patientId),
        ]);
        const intervals = ivd as IntervalDynData;
        const medBySlot = mbs as SlotAdherence;

        // ── 화면(Records.tsx)과 100% 동일한 차트 입력으로 변환 ──
        const medication = days.map((d, i) => ({ date: d, adherence: adh[i]?.value ?? null }));
        const exercise = days.map((d, i) => ({ date: d, minutes: exc[i]?.value ?? null }));
        const sleepBar = sleepScoresToSingle(slpSc as { date: string; counts: ScoreCounts }[]);
        const constipation = constipationToSingle(cst);

        // ── 화면 "요약"(Records.tsx averages) 과 100% 동일 ──
        const averages = computeAverages(
          medication.map((r) => ({ adherence: r.adherence })),
          intervals,
          days.map((_d, i) => ({ sleep: slp[i]?.value ?? null })),
          constipation,
          eLogs as ExerciseDetailLog[],
          t,
        );
        const constipationAvgCycle = computeConstipationAvgCycle(constipation as Record<string, any>[]);

        // ── 동적 복용 슬롯 / 약효추적 간격 메타 ──
        const medSlots: PdfMedSlotSpec[] = medBySlot.slots.map((s) => ({ key: `med:${s.key}`, title: s.label }));
        const bodyIntervals: PdfIntervalSpec[] = intervals.intervals.map((m) => ({
          key: intervalKey('body', m),
          title: intervalLabelFull('body', m),
          counts: aggCounts(intervals.scores[intervalKey('body', m)] ?? []),
        }));
        const moodIntervals: PdfIntervalSpec[] = intervals.intervals.map((m) => ({
          key: intervalKey('mood', m),
          title: intervalLabelFull('mood', m),
          counts: aggCounts(intervals.scores[intervalKey('mood', m)] ?? []),
        }));

        // ── 측정 데이터 가공 (탭핑·반응속도) ──
        const tapData = tapTrend as DailyPoint[];
        const rtData = rtTrend as DailyPoint[];
        const baselines = mBaselines as MeasurementBaselines;
        const tapHasAny = tapData.some((r) => r.value != null);
        const rtHasAny = rtData.some((r) => r.value != null);
        const hasMeasurementData = tapHasAny || rtHasAny;

        // baseline_stats 는 더 이상 PDF 측정 카드에서 사용하지 않는다(화면 SymptomDetail 과 동일 방식).
        // 평균값은 RecordsPdf 의 MeasurementCard 내부에서 차트 데이터 non-null 평균으로 직접 계산.
        void baselines;

        // 차트 Y축 도메인 — 차트 데이터 기준 (화면 SymptomDetail 과 동일 산식)
        const tapValues = tapData.map((r) => r.value).filter((v): v is number => v != null);
        const tapMax = tapValues.length ? Math.max(...tapValues) : 0;
        const tapDomainMax = Math.max(10, Math.ceil(tapMax * 1.2 / 10) * 10);

        const rtValues = rtData.map((r) => r.value).filter((v): v is number => v != null);
        const rtMax = rtValues.length ? Math.max(...rtValues) : 0;
        const rtDomainMax = Math.max(500, Math.ceil(rtMax * 1.2 / 100) * 100);

        const measurement: MeasurementSectionData = {
          tap: tapHasAny ? { data: tapData } : undefined,
          reaction: rtHasAny ? { data: rtData } : undefined,
        };

        const standardSpecs: PdfChartSpec[] = [
          {
            key: 'medication', data: medication, valueKey: 'adherence',
            color: '#4CAF50', yDomain: [0, 100], yTicks: [0, 25, 50, 75, 100], yUnit: '%',
            refLines: ch as MedChange[],
            showTrendline,
          },
          // 복용 시점(활성 dose_slot)별 — 커스텀 슬롯 포함
          ...medBySlot.slots.map((s): PdfChartSpec => ({
            key: `med:${s.key}`,
            data: (medBySlot.bySlot[s.key] ?? []).map((p) => ({ date: p.date, adherence: p.value })),
            valueKey: 'adherence',
            color: '#C8E6C9', yDomain: [0, 100], yTicks: [0, 25, 50, 75, 100], yUnit: '%',
            showTrendline,
          })),
          // 몸 상태 / 기분 상태 — 동적 track_interval 별
          ...(['body', 'mood'] as const).flatMap((field) =>
            intervals.intervals.map((m): PdfChartSpec => ({
              key: intervalKey(field, m),
              data: scoreRowsToSingle(intervals.scores[intervalKey(field, m)] ?? []),
              valueKey: 'score',
              color: '#4CAF50', yDomain: [0, 5], yTicks: [0, 1, 2, 3, 4, 5],
              showTrendline,
            }))
          ),
          {
            key: 'sleep', data: sleepBar, valueKey: 'score',
            color: '#4CAF50', yDomain: [0, 5], yTicks: [0, 1, 2, 3, 4, 5],
            showTrendline,
          },
          {
            // 화면 변비 차트는 noTrendline → PDF 도 추세선 없음
            key: 'constipation', data: constipation, valueKey: 'value',
            color: '#4CAF50', yDomain: [0, 2], yTicks: [0, 1, 2],
            showTrendline: false,
          },
          {
            key: 'exercise', data: exercise, valueKey: 'minutes',
            color: '#4CAF50', yDomain: [0, 180], yTicks: [0, 30, 60, 90, 120, 150, 180], yUnit: '분',
            showTrendline,
          },
        ];

        const measurementSpecs: AnyCaptureSpec[] = [];
        if (tapHasAny) {
          measurementSpecs.push({
            kind: 'measurement',
            key: MEASUREMENT_CHART_KEYS.tap,
            data: tapData,
            color: '#F57C00', // 화면 SymptomDetail 의 탭핑 막대 색과 동일
            yDomain: [0, tapDomainMax],
            yUnit: '회',
          });
        }
        if (rtHasAny) {
          measurementSpecs.push({
            kind: 'measurement',
            key: MEASUREMENT_CHART_KEYS.reaction,
            data: rtData,
            color: '#F57C00', // 화면 SymptomDetail 의 반응속도 막대 색과 동일
            yDomain: [0, rtDomainMax],
            yUnit: 'ms',
          });
        }

        const specs: AnyCaptureSpec[] = [...standardSpecs, ...measurementSpecs];

        setData({
          name: nm,
          from: range.from,
          to: range.to,
          bodyIntervals,
          moodIntervals,
          medSlots,
          medChanges: ch as MedChange[],
          specs,
          averages,
          constipationAvgCycle,
          measurement,
          hasMeasurementData,
        });

        // 측정 데이터 0건이면 체크박스에서 measurement 해제(시각적 비활성 + 선택 불가)
        if (!hasMeasurementData) {
          setSelected((prev) => {
            if (!prev.has('measurement')) return prev;
            const next = new Set(prev);
            next.delete('measurement');
            return next;
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [patientId, patientName, range.from, range.to, showTrendline, t]);

  // ChartCapture 가 캡처 완료를 알리면 PDF 생성
  const onChartsReady = async (images: Record<string, string>) => {
    setCaptureSpecs(null); // 오프스크린 차트 언마운트
    if (!data) {
      setGenerating(false);
      setPdfPhase(null);
      return;
    }
    // 차트 캡처 완료 → ③PDF 만들기
    setPdfPhase('pdf');
    try {
      const props: RecordsPdfProps = {
        name: data.name,
        from: data.from,
        to: data.to,
        generatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
        bodyIntervals: data.bodyIntervals,
        moodIntervals: data.moodIntervals,
        medSlots: data.medSlots,
        medChanges: data.medChanges,
        chartImages: images,
        selected,
        averages: data.averages,
        constipationAvgCycle: data.constipationAvgCycle,
        measurement: data.measurement,
      };
      const blob = await pdf(<RecordsPdf {...props} />).toBlob();
      const url = URL.createObjectURL(blob);
      const fileName = recordsPdfFileName(name);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (lastUrl) URL.revokeObjectURL(lastUrl);
      setLastUrl(url);
      setLastFileName(fileName);
      // blob 다운로드 직후 → 완료(체크서클 → 0.8s 후 fade-out)
      setPdfPhase('done');
      setToast(t('exportPdf.savedToast'));
      setTimeout(() => setToast(null), 4000);
    } catch (e: any) {
      console.error('[PDF generate error]', e);
      const msg = e?.message || String(e);
      setPdfPhase(null); // 오류 시 오버레이 즉시 닫고 기존 알림 노출
      alert(t('exportPdf.errorAlert', { reason: msg.slice(0, 200) }));
      setToast(t('exportPdf.errorToast', { reason: msg.slice(0, 80) }));
      setTimeout(() => setToast(null), 6000);
    } finally {
      setGenerating(false);
    }
  };

  const generate = () => {
    if (!data || selectedCount === 0) return;
    setGenerating(true);
    setToast(null);
    // W1 오버레이: ①데이터 모으기 (이미 로드된 data 확정 시점) → 곧 ②그래프 그리기로 진행
    setPdfPhase('fetch');
    // 선택된 섹션에 해당하는 차트만 캡처 (미선택은 캡처 비용도 절약)
    const specsToCapture = data.specs.filter((s) => {
      const sec = specKeyToSection(s.key);
      return sec ? selected.has(sec) : false;
    });
    // 한 프레임 뒤 ②그래프 그리기로 전환하며 오프스크린 차트 마운트(캡처 시작)
    requestAnimationFrame(() => {
      setPdfPhase('chart');
      // 오프스크린 차트 마운트 → 캡처 → onChartsReady 에서 PDF 생성
      setCaptureSpecs(specsToCapture);
    });
  };

  const redownload = () => {
    if (!lastUrl || !lastFileName) return;
    const a = document.createElement('a');
    a.href = lastUrl;
    a.download = lastFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div>
      <RangePicker />

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{name || t('records.patientFallback')}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {range.from} ~ {range.to}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 56, justifyContent: 'flex-end', flexWrap: 'wrap', width: '100%' }}>
            <div style={{ display: 'flex', minHeight: 56, alignItems: 'center', visibility: lastUrl ? 'visible' : 'hidden', flexShrink: 0 }}>
              <button onClick={redownload} disabled={generating || !lastUrl}>
                {t('exportPdf.redownload')}
              </button>
            </div>
            <button
              onClick={generate}
              disabled={generating || loading || !data || selectedCount === 0}
              style={{
                minHeight: 56,
                width: '100%',
                maxWidth: 280,
                boxSizing: 'border-box',
                padding: '0 22px',
                fontSize: 17,
                fontWeight: 700,
                background: selectedCount === 0 ? '#9CA3AF' : '#4CAF50',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
              }}
            >
              {generating
                ? t('exportPdf.generating')
                : loading
                ? t('exportPdf.loadingData')
                : selectedCount === 0
                ? t('exportPdf.selectAtLeastOne')
                : t('exportPdf.makePdfWithCount', { count: selectedCount })}
            </button>
          </div>
        </div>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          {t('exportPdf.captureNote')}
        </p>
      </div>

      <div className="card">
        <div
          style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12,
          }}
        >
          <div className="section-title" style={{ margin: 0 }}>{t('exportPdf.selectCharts')}</div>
          <button
            onClick={toggleAll}
            style={{
              minHeight: 48,
              padding: '0 18px',
              fontSize: 16,
              fontWeight: 700,
              background: '#fff',
              color: '#4CAF50',
              border: '2px solid #4CAF50',
              borderRadius: 10,
            }}
          >
            {allSelected ? t('exportPdf.deselectAll') : t('exportPdf.selectAll')}
          </button>
        </div>

        <div
          style={{
            border: '1.5px solid #C8E6C9',
            borderRadius: 10,
            padding: '14px 14px',
            background: '#F2FAFA',
            color: '#374151',
            fontSize: 16,
            lineHeight: 1.5,
            marginBottom: 14,
          }}
        >
          {t('exportPdf.coverPageNote')}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SECTION_KEYS.map((k) => {
            const on = selected.has(k);
            // 측정 데이터 0건이면 measurement 항목은 비활성·회색 처리
            const disabled = k === 'measurement' && data != null && !data.hasMeasurementData;
            return (
              <div
                key={k}
                role="checkbox"
                aria-checked={on}
                aria-disabled={disabled}
                tabIndex={disabled ? -1 : 0}
                onClick={() => { if (!disabled) toggleSection(k); }}
                onKeyDown={(e) => {
                  if (disabled) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleSection(k);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  minHeight: 60,
                  padding: '12px 16px',
                  borderRadius: 12,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  userSelect: 'none',
                  border: disabled
                    ? '2px solid #E5E7EB'
                    : on
                    ? '2px solid #4CAF50'
                    : '2px solid var(--border, #E5E7EB)',
                  background: disabled ? '#F3F4F6' : on ? '#EAF7EA' : '#fff',
                  opacity: disabled ? 0.6 : 1,
                  transition: 'background .12s, border-color .12s',
                }}
              >
                <CheckMark on={on} />
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: on ? 700 : 500,
                    color: disabled ? '#9CA3AF' : on ? '#1F2937' : '#374151',
                  }}
                >
                  {PDF_SECTION_LABELS[k]}
                  {disabled && (
                    <span style={{ fontSize: 14, fontWeight: 400, color: '#9CA3AF', marginLeft: 10 }}>
                      {t('exportPdf.noMeasurementData')}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        <p className="muted" style={{ fontSize: 14, margin: '14px 0 0' }}>
          {t('exportPdf.selectedCount', { selected: selectedCount, total: SECTION_KEYS.length })}
        </p>
      </div>

      {/* 오프스크린 차트 캡처 (generate 클릭 시에만 마운트) */}
      {captureSpecs && <ChartCapture specs={captureSpecs} onReady={onChartsReady} />}

      {/* W1 — PDF 만들기 차단 진행 오버레이 (생성 중 타 버튼 클릭 차단) */}
      <BrandProgressOverlay
        open={pdfPhase != null}
        steps={PDF_STEPS}
        activeIndex={pdfPhase === 'fetch' ? 0 : pdfPhase === 'chart' ? 1 : 2}
        done={pdfPhase === 'done'}
        title={t('exportPdf.overlayTitle')}
        doneTitle={t('exportPdf.overlayDoneTitle')}
        onDoneFinished={() => setPdfPhase(null)}
      />

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#111827',
            color: '#fff',
            padding: '12px 18px',
            borderRadius: 999,
            fontSize: 14,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            zIndex: 9999,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
