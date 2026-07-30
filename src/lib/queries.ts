import dayjs from 'dayjs';
import { tr } from '../i18n';
import { supabase } from './supabase';
import { eachDay } from './dateRange';

// exercise_logs.exercise_type은 기록 당시 로케일로 "번역된 라벨 문자열"이 그대로 저장된다
// (앱 constants/exerciseTypes.ts와 동일한 데이터 구조·동일한 이유). 알려진 사전 정의
// 운동 라벨(한/영)만 역매핑해 현재 로케일로 재번역하고, 직접입력한 커스텀 운동명은 그대로 둔다.
const RAW_EXERCISE_TYPE_TO_ID: Record<string, string> = {
  '걷기': 'walk', 'Walking': 'walk',
  '근력': 'strength', 'Strength': 'strength',
  '균형': 'balance', 'Balance': 'balance',
  '스트레칭': 'stretch', 'Stretching': 'stretch',
  '자전거': 'bike', 'Cycling': 'bike',
  '수영': 'swim', 'Swimming': 'swim',
  '댄스': 'dance', 'Dancing': 'dance',
  '복싱': 'boxing', 'Boxing': 'boxing',
  '요가': 'yoga', 'Yoga': 'yoga',
  '조깅': 'jog', 'Jogging': 'jog',
};
export function translateRawExerciseType(raw: string | null | undefined): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return tr('exercise.generic');
  // 저장값은 이제 'walk' 같은 키다. 옛 행(한글·영문 라벨)도 표에서 키로 되돌린다.
  const id = RAW_EXERCISE_TYPE_TO_ID[trimmed] ?? (EXERCISE_TYPE_ORDER.includes(trimmed) ? trimmed : null);
  if (!id) return trimmed; // 사전 정의가 아니면 사용자가 직접 쓴 운동명 — 그대로 표시
  return tr(`exercise.${id}`);
}
/** 사전 정의 운동 종류 안정 id(회전문 정렬·그룹핑용). 커스텀 입력이면 null. */
export function exerciseTypeId(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? '').trim();
  return RAW_EXERCISE_TYPE_TO_ID[trimmed] ?? null;
}
/** 사전 정의 운동 종류의 표준 노출 순서(사전 정의 목록에 없는 커스텀 항목은 이 뒤에 덧붙임). */
export const EXERCISE_TYPE_ORDER: string[] = ['walk', 'strength', 'balance', 'stretch', 'bike', 'swim', 'dance', 'boxing', 'yoga', 'jog'];
/** id → 현재 로케일 표시 라벨. */
export function exerciseTypeLabel(id: string): string {
  return tr(`exercise.${id}`);
}
import {
  fetchDoseSlots, fetchTrackIntervals, parseTriggerMinutes, formatIntervalLabel,
  slotDisplayTitle,
  type DoseSlot,
} from './doseSlots';
export { formatIntervalLabel, parseTriggerMinutes } from './doseSlots';

export type DailyPoint = { date: string; value: number | null };

/**
 * 약 복용률 (일별 %).
 * 기대 복용 횟수 = 활성 medications의 scheduled_times 길이 합 (없으면 meal_times 길이, 그래도 없으면 3)
 * 실제 복용 = 그 날 med_logs row 수
 */
export async function fetchMedicationAdherence(patientId: string, from: string, to: string): Promise<DailyPoint[]> {
  const fromIso = dayjs(from).startOf('day').toISOString();
  const toIso = dayjs(to).endOf('day').toISOString();

  const [{ data: logs }, { data: meds }] = await Promise.all([
    supabase.from('med_logs')
      .select('id, taken_at, medication_id')
      .eq('patient_id', patientId)
      .gte('taken_at', fromIso)
      .lte('taken_at', toIso),
    supabase.from('medications')
      .select('id, scheduled_times, meal_times, created_at, ended_at')
      .eq('patient_id', patientId),
  ]);

  const days = eachDay(from, to);
  const expectedByDay: Record<string, number> = {};
  const takenByDay: Record<string, number> = {};
  for (const d of days) {
    let exp = 0;
    const dayEnd = dayjs(d).endOf('day');
    const dayStart = dayjs(d).startOf('day');
    for (const m of (meds ?? []) as any[]) {
      const start = m.created_at ? dayjs(m.created_at) : null;
      const end = m.ended_at ? dayjs(m.ended_at) : null;
      const active = (!start || start.isBefore(dayEnd)) && (!end || end.isAfter(dayStart));
      if (!active) continue;
      const doses =
        (Array.isArray(m.scheduled_times) && m.scheduled_times.length > 0) ? m.scheduled_times.length
        : (Array.isArray(m.meal_times) && m.meal_times.length > 0) ? m.meal_times.length
        : 3;
      exp += doses;
    }
    expectedByDay[d] = exp;
    takenByDay[d] = 0;
  }
  for (const log of (logs ?? []) as any[]) {
    const day = dayjs(log.taken_at).format('YYYY-MM-DD');
    if (day in takenByDay) takenByDay[day] += 1;
  }
  return days.map((d) => {
    const exp = expectedByDay[d] || 0;
    if (exp === 0) return { date: d, value: null };
    return { date: d, value: Math.min(100, Math.round((takenByDay[d] / exp) * 100)) };
  });
}

export type SymptomPoints = {
  date: string;
  immediate: number | null;
  thirty: number | null;
  twoHour: number | null;
};

/**
 * 몸상태(body_state) 트렌드.
 * on_off_logs.trigger_time_label로 슬롯 구분: 복용직후 / 30분 / 2시간
 * triggered_by='notification'인 기록만 (수시 입력은 패턴에서 제외)
 */
export async function fetchSymptoms(patientId: string, from: string, to: string): Promise<SymptomPoints[]> {
  const fromIso = dayjs(from).startOf('day').toISOString();
  const toIso = dayjs(to).endOf('day').toISOString();
  const { data } = await supabase.from('on_off_logs')
    .select('logged_at, body_state, trigger_time_label, triggered_by')
    .eq('patient_id', patientId)
    .eq('triggered_by', 'notification')
    .gte('logged_at', fromIso)
    .lte('logged_at', toIso);

  const days = eachDay(from, to);
  const map: Record<string, { i: number[]; t: number[]; h: number[] }> = {};
  for (const d of days) map[d] = { i: [], t: [], h: [] };
  for (const row of (data ?? []) as any[]) {
    const day = dayjs(row.logged_at).format('YYYY-MM-DD');
    if (!(day in map)) continue;
    const score = Number(row.body_state);
    if (Number.isNaN(score)) continue;
    const label = (row.trigger_time_label || '').toString();
    if (label.includes('직후') || label.includes('immediate')) map[day].i.push(score);
    else if (label.includes('30')) map[day].t.push(score);
    else if (label.includes('2') || label.includes('120')) map[day].h.push(score);
    else map[day].i.push(score);
  }
  const avg = (arr: number[]) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null);
  return days.map((d) => ({
    date: d,
    immediate: avg(map[d].i),
    thirty: avg(map[d].t),
    twoHour: avg(map[d].h),
  }));
}

/**
 * 약효 ON 비율 (%).
 * on_off_logs.body_state >= 4 (5점 만점, 4~5점이면 효과 ON으로 간주)
 * 알림 기반 기록만 (triggered_by='notification')
 */
export async function fetchOnOff(patientId: string, from: string, to: string): Promise<DailyPoint[]> {
  const fromIso = dayjs(from).startOf('day').toISOString();
  const toIso = dayjs(to).endOf('day').toISOString();
  const { data } = await supabase.from('on_off_logs')
    .select('logged_at, body_state, triggered_by')
    .eq('patient_id', patientId)
    .eq('triggered_by', 'notification')
    .gte('logged_at', fromIso)
    .lte('logged_at', toIso);
  const days = eachDay(from, to);
  const map: Record<string, { on: number; total: number }> = {};
  for (const d of days) map[d] = { on: 0, total: 0 };
  for (const row of (data ?? []) as any[]) {
    const day = dayjs(row.logged_at).format('YYYY-MM-DD');
    if (!(day in map)) continue;
    map[day].total += 1;
    if (Number(row.body_state) >= 4) map[day].on += 1;
  }
  return days.map((d) => {
    const m = map[d];
    if (m.total === 0) return { date: d, value: null };
    return { date: d, value: Math.round((m.on / m.total) * 100) };
  });
}

export async function fetchExercise(patientId: string, from: string, to: string): Promise<DailyPoint[]> {
  const fromIso = dayjs(from).startOf('day').toISOString();
  const toIso = dayjs(to).endOf('day').toISOString();
  const { data } = await supabase.from('exercise_logs')
    .select('logged_at, duration_minutes')
    .eq('patient_id', patientId)
    .gte('logged_at', fromIso)
    .lte('logged_at', toIso);
  const days = eachDay(from, to);
  const map: Record<string, number | null> = {};
  for (const d of days) map[d] = null;
  for (const row of (data ?? []) as any[]) {
    const day = dayjs(row.logged_at).format('YYYY-MM-DD');
    if (!(day in map)) continue;
    map[day] = (map[day] ?? 0) + Number(row.duration_minutes ?? 0);
  }
  return days.map((d) => ({ date: d, value: map[d] }));
}

/**
 * 슬롯(복용직후/30분/2시간) × 항목(body_state/mood) 6개 일별 평균
 */
export type SlotPoints = {
  date: string;
  bodyImmediate: number | null;
  bodyThirty: number | null;
  bodyTwoHour: number | null;
  moodImmediate: number | null;
  moodThirty: number | null;
  moodTwoHour: number | null;
};

export async function fetchSymptomSlots(patientId: string, from: string, to: string): Promise<SlotPoints[]> {
  const fromIso = dayjs(from).startOf('day').toISOString();
  const toIso = dayjs(to).endOf('day').toISOString();
  const { data } = await supabase.from('on_off_logs')
    .select('logged_at, body_state, mood, trigger_time_label, triggered_by')
    .eq('patient_id', patientId)
    .eq('triggered_by', 'notification')
    .gte('logged_at', fromIso)
    .lte('logged_at', toIso);

  const days = eachDay(from, to);
  const map: Record<string, { bi: number[]; bt: number[]; bh: number[]; mi: number[]; mt: number[]; mh: number[] }> = {};
  for (const d of days) map[d] = { bi: [], bt: [], bh: [], mi: [], mt: [], mh: [] };

  for (const row of (data ?? []) as any[]) {
    const day = dayjs(row.logged_at).format('YYYY-MM-DD');
    if (!(day in map)) continue;
    const label = (row.trigger_time_label || '').toString();
    let slot: 'i' | 't' | 'h' = 'i';
    if (label.includes('30')) slot = 't';
    else if (label.includes('2') || label.includes('120')) slot = 'h';
    else if (label.includes('직후') || label.includes('immediate')) slot = 'i';

    const body = Number(row.body_state);
    if (!Number.isNaN(body)) {
      if (slot === 'i') map[day].bi.push(body);
      else if (slot === 't') map[day].bt.push(body);
      else map[day].bh.push(body);
    }
    const mood = Number(row.mood);
    if (!Number.isNaN(mood) && row.mood != null) {
      if (slot === 'i') map[day].mi.push(mood);
      else if (slot === 't') map[day].mt.push(mood);
      else map[day].mh.push(mood);
    }
  }
  const avg = (arr: number[]) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null);
  return days.map((d) => ({
    date: d,
    bodyImmediate: avg(map[d].bi),
    bodyThirty: avg(map[d].bt),
    bodyTwoHour: avg(map[d].bh),
    moodImmediate: avg(map[d].mi),
    moodThirty: avg(map[d].mt),
    moodTwoHour: avg(map[d].mh),
  }));
}

/**
 * 슬롯(복용직후/30분/2시간) × 항목(body_state/mood) 6개의 일별 raw 카운트.
 * 각 일자별 total/on(>=4)/off(<=2) 기록 수를 반환.
 * 비율 계산은 클라이언트에서 brush 선택 구간의 합으로 한다.
 */
export type SlotDayStats = {
  date: string;
  bodyImmediate: { total: number; on: number; off: number };
  bodyThirty:    { total: number; on: number; off: number };
  bodyTwoHour:   { total: number; on: number; off: number };
  moodImmediate: { total: number; on: number; off: number };
  moodThirty:    { total: number; on: number; off: number };
  moodTwoHour:   { total: number; on: number; off: number };
};

export async function fetchSymptomSlotStats(patientId: string, from: string, to: string): Promise<SlotDayStats[]> {
  const fromIso = dayjs(from).startOf('day').toISOString();
  const toIso = dayjs(to).endOf('day').toISOString();
  const { data } = await supabase.from('on_off_logs')
    .select('logged_at, body_state, mood, trigger_time_label, triggered_by')
    .eq('patient_id', patientId)
    .eq('triggered_by', 'notification')
    .gte('logged_at', fromIso)
    .lte('logged_at', toIso);

  const days = eachDay(from, to);
  const empty = () => ({ total: 0, on: 0, off: 0 });
  const map: Record<string, SlotDayStats> = {};
  for (const d of days) {
    map[d] = {
      date: d,
      bodyImmediate: empty(), bodyThirty: empty(), bodyTwoHour: empty(),
      moodImmediate: empty(), moodThirty: empty(), moodTwoHour: empty(),
    };
  }

  for (const row of (data ?? []) as any[]) {
    const day = dayjs(row.logged_at).format('YYYY-MM-DD');
    if (!(day in map)) continue;
    const label = (row.trigger_time_label || '').toString();
    let slot: 'i' | 't' | 'h' = 'i';
    if (label.includes('30')) slot = 't';
    else if (label.includes('2') || label.includes('120')) slot = 'h';
    else if (label.includes('직후') || label.includes('immediate')) slot = 'i';

    const body = Number(row.body_state);
    if (row.body_state != null && !Number.isNaN(body)) {
      const key = slot === 'i' ? 'bodyImmediate' : slot === 't' ? 'bodyThirty' : 'bodyTwoHour';
      map[day][key].total += 1;
      if (body >= 4) map[day][key].on += 1;
      else if (body <= 2) map[day][key].off += 1;
    }
    const mood = Number(row.mood);
    if (row.mood != null && !Number.isNaN(mood)) {
      const key = slot === 'i' ? 'moodImmediate' : slot === 't' ? 'moodThirty' : 'moodTwoHour';
      map[day][key].total += 1;
      if (mood >= 4) map[day][key].on += 1;
      else if (mood <= 2) map[day][key].off += 1;
    }
  }
  return days.map((d) => map[d]);
}

/**
 * 슬롯별 일별 점수 카운트 (1~5점).
 * Bearable 스타일 stacked bar용.
 */
export type ScoreCounts = { c1: number; c2: number; c3: number; c4: number; c5: number };
export type SlotDayScores = {
  date: string;
  bodyImmediate: ScoreCounts;
  bodyThirty: ScoreCounts;
  bodyTwoHour: ScoreCounts;
  moodImmediate: ScoreCounts;
  moodThirty: ScoreCounts;
  moodTwoHour: ScoreCounts;
};

export async function fetchSymptomSlotScores(patientId: string, from: string, to: string): Promise<SlotDayScores[]> {
  const fromIso = dayjs(from).startOf('day').toISOString();
  const toIso = dayjs(to).endOf('day').toISOString();
  const { data } = await supabase.from('on_off_logs')
    .select('logged_at, body_state, mood, trigger_time_label, triggered_by')
    .eq('patient_id', patientId)
    .eq('triggered_by', 'notification')
    .gte('logged_at', fromIso)
    .lte('logged_at', toIso);

  const days = eachDay(from, to);
  const empty = (): ScoreCounts => ({ c1: 0, c2: 0, c3: 0, c4: 0, c5: 0 });
  const map: Record<string, SlotDayScores> = {};
  for (const d of days) {
    map[d] = {
      date: d,
      bodyImmediate: empty(), bodyThirty: empty(), bodyTwoHour: empty(),
      moodImmediate: empty(), moodThirty: empty(), moodTwoHour: empty(),
    };
  }
  // 같은 (날짜, 슬롯, 종류[body/mood])에서 가장 마지막 logged_at 1건만 사용
  const sorted = ((data ?? []) as any[]).slice().sort((a, b) =>
    dayjs(a.logged_at).valueOf() - dayjs(b.logged_at).valueOf()
  );
  const lastBody: Record<string, number> = {};
  const lastMood: Record<string, number> = {};
  for (const row of sorted) {
    const day = dayjs(row.logged_at).format('YYYY-MM-DD');
    if (!(day in map)) continue;
    const label = (row.trigger_time_label || '').toString();
    let slot: 'i' | 't' | 'h' = 'i';
    if (label.includes('30')) slot = 't';
    else if (label.includes('2') || label.includes('120')) slot = 'h';
    const slotKeyBody = slot === 'i' ? 'bodyImmediate' : slot === 't' ? 'bodyThirty' : 'bodyTwoHour';
    const slotKeyMood = slot === 'i' ? 'moodImmediate' : slot === 't' ? 'moodThirty' : 'moodTwoHour';
    const body = Number(row.body_state);
    if (row.body_state != null && !Number.isNaN(body) && body >= 1 && body <= 5) {
      lastBody[`${day}|${slotKeyBody}`] = Math.round(body);
    }
    const mood = Number(row.mood);
    if (row.mood != null && !Number.isNaN(mood) && mood >= 1 && mood <= 5) {
      lastMood[`${day}|${slotKeyMood}`] = Math.round(mood);
    }
  }
  for (const k of Object.keys(lastBody)) {
    const [day, slotKey] = k.split('|');
    const v = lastBody[k];
    (map[day][slotKey as keyof SlotDayScores] as any)['c' + v] += 1;
  }
  for (const k of Object.keys(lastMood)) {
    const [day, slotKey] = k.split('|');
    const v = lastMood[k];
    (map[day][slotKey as keyof SlotDayScores] as any)['c' + v] += 1;
  }
  return days.map((d) => map[d]);
}

/** 취침상태 일별 점수 카운트 */
export async function fetchSleepScores(patientId: string, from: string, to: string): Promise<{ date: string; counts: ScoreCounts }[]> {
  const fromIso = dayjs(from).startOf('day').toISOString();
  const toIso = dayjs(to).endOf('day').toISOString();
  const { data } = await supabase.from('on_off_logs')
    .select('logged_at, sleep_quality')
    .eq('patient_id', patientId)
    .not('sleep_quality', 'is', null)
    .gte('logged_at', fromIso)
    .lte('logged_at', toIso);
  const days = eachDay(from, to);
  const empty = (): ScoreCounts => ({ c1: 0, c2: 0, c3: 0, c4: 0, c5: 0 });
  const map: Record<string, ScoreCounts> = {};
  for (const d of days) map[d] = empty();
  // 같은 날 마지막 기록 1건만 사용
  const sorted = ((data ?? []) as any[]).slice().sort((a, b) =>
    dayjs(a.logged_at).valueOf() - dayjs(b.logged_at).valueOf()
  );
  const last: Record<string, number> = {};
  for (const row of sorted) {
    const day = dayjs(row.logged_at).format('YYYY-MM-DD');
    if (!(day in map)) continue;
    const v = Math.round(Number(row.sleep_quality));
    if (v >= 1 && v <= 5) last[day] = v;
  }
  for (const day of Object.keys(last)) {
    (map[day] as any)['c' + last[day]] += 1;
  }
  return days.map((d) => ({ date: d, counts: map[d] }));
}

/**
 * SlotDayScores → 슬롯별 단일 점수값 (1~5, 없으면 null) 행으로 변환.
 * 같은 날 점수 카운트(c1~c5) 중 가장 높은 점수(중복 시 마지막 점수)를 선택.
 * fetchSymptomSlotScores가 이미 (날짜,슬롯,종류)당 마지막 1건만 c#에 +1 하므로
 * c1~c5 중 정확히 1개만 1이고 나머지는 0이거나, 모두 0(null).
 */
export function slotScoresToSingle(
  rows: SlotDayScores[],
  slotKey: keyof SlotDayScores
): { date: string; score: number | null }[] {
  return rows.map((r) => {
    const c = r[slotKey] as ScoreCounts;
    let score: number | null = null;
    for (let i = 5; i >= 1; i--) {
      if ((c as any)['c' + i] > 0) { score = i; break; }
    }
    return { date: r.date, score };
  });
}

/** 취침 점수 카운트 → 단일 점수 행 */
export function sleepScoresToSingle(
  rows: { date: string; counts: ScoreCounts }[]
): { date: string; score: number | null }[] {
  return rows.map((r) => {
    let score: number | null = null;
    for (let i = 5; i >= 1; i--) {
      if ((r.counts as any)['c' + i] > 0) { score = i; break; }
    }
    return { date: r.date, score };
  });
}

/**
 * 변비 카운트 → 단일 값.
 * 변 본 날(yes>0): 2, 안 본 날(no>0, yes==0): 1, 기록 없음: null.
 */
export function constipationToSingle(
  rows: { date: string; yes: number; no: number }[]
): { date: string; value: number | null }[] {
  return rows.map((r) => {
    if (r.yes > 0) return { date: r.date, value: 2 };
    if (r.no > 0) return { date: r.date, value: 1 };
    return { date: r.date, value: null };
  });
}

/** 변비 일별 카운트 (변본/안본) */
export async function fetchConstipationCounts(patientId: string, from: string, to: string): Promise<{ date: string; yes: number; no: number }[]> {
  const fromIso = dayjs(from).startOf('day').toISOString();
  const toIso = dayjs(to).endOf('day').toISOString();
  const { data } = await supabase.from('on_off_logs')
    .select('logged_at, constipation')
    .eq('patient_id', patientId)
    .not('constipation', 'is', null)
    .gte('logged_at', fromIso)
    .lte('logged_at', toIso);
  const days = eachDay(from, to);
  const map: Record<string, { yes: number; no: number }> = {};
  for (const d of days) map[d] = { yes: 0, no: 0 };
  for (const row of (data ?? []) as any[]) {
    const day = dayjs(row.logged_at).format('YYYY-MM-DD');
    if (!(day in map)) continue;
    if (row.constipation === true) map[day].yes += 1;
    else if (row.constipation === false) map[day].no += 1;
  }
  return days.map((d) => ({ date: d, yes: map[d].yes, no: map[d].no }));
}

/** 취침상태(sleep_quality) 일별 평균 */
export async function fetchSleep(patientId: string, from: string, to: string): Promise<DailyPoint[]> {
  const fromIso = dayjs(from).startOf('day').toISOString();
  const toIso = dayjs(to).endOf('day').toISOString();
  const { data } = await supabase.from('on_off_logs')
    .select('logged_at, sleep_quality')
    .eq('patient_id', patientId)
    .not('sleep_quality', 'is', null)
    .gte('logged_at', fromIso)
    .lte('logged_at', toIso);
  const days = eachDay(from, to);
  const map: Record<string, number[]> = {};
  for (const d of days) map[d] = [];
  for (const row of (data ?? []) as any[]) {
    const day = dayjs(row.logged_at).format('YYYY-MM-DD');
    if (!(day in map)) continue;
    const v = Number(row.sleep_quality);
    if (!Number.isNaN(v)) map[day].push(v);
  }
  return days.map((d) => {
    const arr = map[d];
    if (!arr.length) return { date: d, value: null };
    return { date: d, value: Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 };
  });
}

/** 변비(constipation) 일별: 변 본 날=1, 안 본 날=0 (그 날 기록 중 false가 한 번이라도 있으면 "변 본 날") */
export async function fetchConstipation(patientId: string, from: string, to: string): Promise<DailyPoint[]> {
  const fromIso = dayjs(from).startOf('day').toISOString();
  const toIso = dayjs(to).endOf('day').toISOString();
  const { data } = await supabase.from('on_off_logs')
    .select('logged_at, constipation')
    .eq('patient_id', patientId)
    .not('constipation', 'is', null)
    .gte('logged_at', fromIso)
    .lte('logged_at', toIso);
  const days = eachDay(from, to);
  const map: Record<string, { yes: number; no: number }> = {};
  for (const d of days) map[d] = { yes: 0, no: 0 };
  for (const row of (data ?? []) as any[]) {
    const day = dayjs(row.logged_at).format('YYYY-MM-DD');
    if (!(day in map)) continue;
    if (row.constipation === true) map[day].yes += 1;
    else if (row.constipation === false) map[day].no += 1;
  }
  return days.map((d) => {
    const m = map[d];
    if (m.yes === 0 && m.no === 0) return { date: d, value: null };
    // "변 본 날" = 1, "변비/안 본 날" = 0
    return { date: d, value: m.no > 0 ? 1 : 0 };
  });
}

/** 운동 로그 상세 (툴팁용) */
export type ExerciseDetailLog = { date: string; type: string; minutes: number };

export async function fetchExerciseLogs(patientId: string, from: string, to: string): Promise<ExerciseDetailLog[]> {
  const fromIso = dayjs(from).startOf('day').toISOString();
  const toIso = dayjs(to).endOf('day').toISOString();
  const { data } = await supabase.from('exercise_logs')
    .select('logged_at, duration_minutes, exercise_type')
    .eq('patient_id', patientId)
    .gte('logged_at', fromIso)
    .lte('logged_at', toIso);
  return ((data ?? []) as any[]).map((r) => ({
    date: dayjs(r.logged_at).format('YYYY-MM-DD'),
    type: translateRawExerciseType(r.exercise_type),
    minutes: Number(r.duration_minutes ?? 0),
  }));
}

/** 운동 종류별 일별 분 합계 */
export async function fetchExerciseByType(
  patientId: string,
  from: string,
  to: string,
): Promise<Record<string, DailyPoint[]>> {
  const fromIso = dayjs(from).startOf('day').toISOString();
  const toIso = dayjs(to).endOf('day').toISOString();
  const { data } = await supabase
    .from('exercise_logs')
    .select('logged_at, duration_minutes, exercise_type')
    .eq('patient_id', patientId)
    .gte('logged_at', fromIso)
    .lte('logged_at', toIso);
  const days = eachDay(from, to);
  const byType: Record<string, Record<string, number>> = {};
  for (const row of (data ?? []) as any[]) {
    const day = dayjs(row.logged_at).format('YYYY-MM-DD');
    if (!days.includes(day)) continue;
    const type = translateRawExerciseType(row.exercise_type?.toString()) || tr('exercise.other');
    if (!byType[type]) byType[type] = {};
    byType[type][day] = (byType[type][day] ?? 0) + Number(row.duration_minutes ?? 0);
  }
  const result: Record<string, DailyPoint[]> = {};
  for (const type of Object.keys(byType)) {
    const map = byType[type];
    result[type] = days.map((d) => ({ date: d, value: map[d] ?? null }));
  }
  return result;
}

export type MealKey = 'morning' | 'lunch' | 'dinner' | 'bedtime';

/**
 * 약 복용 시점별(아침/점심/저녁/취침) 일별 복용률 (%).
 * - expected: 활성 medications 중 해당 시점이 meal_times 또는 scheduled_times 에 포함된 약 개수
 * - taken: med_logs.meal_time 이 해당 시점인 row 수
 * - expected = 0 인 날은 null
 */
export async function fetchMedicationAdherenceByMeal(
  patientId: string,
  from: string,
  to: string,
): Promise<{ morning: DailyPoint[]; lunch: DailyPoint[]; dinner: DailyPoint[]; bedtime: DailyPoint[] }> {
  const fromIso = dayjs(from).startOf('day').toISOString();
  const toIso = dayjs(to).endOf('day').toISOString();

  const [{ data: logs }, { data: meds }] = await Promise.all([
    supabase.from('med_logs')
      .select('id, taken_at, medication_id, meal_time')
      .eq('patient_id', patientId)
      .gte('taken_at', fromIso)
      .lte('taken_at', toIso),
    supabase.from('medications')
      .select('id, scheduled_times, meal_times, created_at, ended_at')
      .eq('patient_id', patientId),
  ]);

  const MEALS: MealKey[] = ['morning', 'lunch', 'dinner', 'bedtime'];
  const days = eachDay(from, to);

  // meal_times / scheduled_times 의 다양한 표기 → MealKey 매핑
  const normalizeMeal = (v: any): MealKey | null => {
    if (v == null) return null;
    const s = String(v).toLowerCase();
    if (s.includes('morning') || s.includes('아침') || s.startsWith('breakfast') || s.includes('breakfast')) return 'morning';
    if (s.includes('lunch') || s.includes('점심')) return 'lunch';
    if (s.includes('dinner') || s.includes('저녁') || s.includes('supper')) return 'dinner';
    if (s.includes('bed') || s.includes('취침') || s.includes('night') || s.includes('sleep')) return 'bedtime';
    return null;
  };

  // scheduled_times 가 시각("07:30")일 때 시간대로 매핑
  const mealFromTime = (t: any): MealKey | null => {
    const s = String(t ?? '');
    const m = s.match(/(\d{1,2})\s*:?\s*(\d{2})?/);
    if (!m) return null;
    const h = Number(m[1]);
    if (Number.isNaN(h)) return null;
    if (h >= 4 && h < 11) return 'morning';
    if (h >= 11 && h < 15) return 'lunch';
    if (h >= 15 && h < 21) return 'dinner';
    return 'bedtime';
  };

  // expected[meal][day] = 활성 약 개수
  const expected: Record<MealKey, Record<string, number>> = {
    morning: {}, lunch: {}, dinner: {}, bedtime: {},
  };
  const taken: Record<MealKey, Record<string, number>> = {
    morning: {}, lunch: {}, dinner: {}, bedtime: {},
  };
  for (const meal of MEALS) {
    for (const d of days) { expected[meal][d] = 0; taken[meal][d] = 0; }
  }

  for (const d of days) {
    const dayStart = dayjs(d).startOf('day');
    const dayEnd = dayjs(d).endOf('day');
    for (const m of (meds ?? []) as any[]) {
      const start = m.created_at ? dayjs(m.created_at) : null;
      const end = m.ended_at ? dayjs(m.ended_at) : null;
      const active = (!start || start.isBefore(dayEnd)) && (!end || end.isAfter(dayStart));
      if (!active) continue;
      const mealsForMed = new Set<MealKey>();
      if (Array.isArray(m.meal_times)) {
        for (const v of m.meal_times) {
          const mk = normalizeMeal(v);
          if (mk) mealsForMed.add(mk);
        }
      }
      if (Array.isArray(m.scheduled_times)) {
        for (const v of m.scheduled_times) {
          const mk = normalizeMeal(v) ?? mealFromTime(v);
          if (mk) mealsForMed.add(mk);
        }
      }
      for (const mk of mealsForMed) {
        expected[mk][d] += 1;
      }
    }
  }

  for (const log of (logs ?? []) as any[]) {
    const day = dayjs(log.taken_at).format('YYYY-MM-DD');
    if (!(day in taken.morning)) continue;
    const mk = normalizeMeal(log.meal_time);
    if (!mk) continue;
    taken[mk][day] += 1;
  }

  const build = (meal: MealKey): DailyPoint[] => days.map((d) => {
    const e = expected[meal][d] || 0;
    if (e === 0) return { date: d, value: null };
    return { date: d, value: Math.min(100, Math.round((taken[meal][d] / e) * 100)) };
  });

  return {
    morning: build('morning'),
    lunch: build('lunch'),
    dinner: build('dinner'),
    bedtime: build('bedtime'),
  };
}

export type MedChange = { date: string; label: string };

/**
 * ──────────────────────────────────────────────────────────────────────────
 * 디지털 바이오마커 측정 (탭핑·반응속도)
 * 신규 테이블: measurements / measurement_features / baseline_stats
 * 참고: docs/digital_biomarker_mvpA_spec.md §5.2(보호자 추세), §6(결과 표시 정책)
 * ──────────────────────────────────────────────────────────────────────────
 */

export type MeasurementBaselines = {
  tap?: { mean: number; n: number };
  reaction?: { mean: number; n: number };
};

/**
 * 사용자 baseline 통계 조회.
 * feature_key: tap_count(탭핑) / rt_mean_ms(반응속도)
 * n < 14 이면 화면에서 "학습 중" 안내(§6.1).
 */
export async function fetchMeasurementBaselines(userId: string): Promise<MeasurementBaselines> {
  const { data } = await supabase
    .from('baseline_stats')
    .select('feature_key, mean, n')
    .eq('user_id', userId)
    .in('feature_key', ['tap_count', 'rt_mean_ms']);
  const out: MeasurementBaselines = {};
  for (const row of (data ?? []) as any[]) {
    const mean = Number(row.mean);
    const n = Number(row.n);
    if (Number.isNaN(mean) || Number.isNaN(n)) continue;
    if (row.feature_key === 'tap_count') out.tap = { mean, n };
    else if (row.feature_key === 'rt_mean_ms') out.reaction = { mean, n };
  }
  return out;
}

/**
 * 일별 측정 feature 평균 (지난 days 일).
 * @param type 'tap' | 'reaction' — measurements.type 필터
 * @param featureKey 'tap_count' | 'rt_mean_ms'
 */
async function fetchMeasurementTrendByType(
  userId: string,
  type: 'tap' | 'reaction',
  featureKey: 'tap_count' | 'rt_mean_ms',
  days: number,
): Promise<DailyPoint[]> {
  const to = dayjs().format('YYYY-MM-DD');
  const from = dayjs().subtract(days - 1, 'day').format('YYYY-MM-DD');
  const fromIso = dayjs(from).startOf('day').toISOString();
  const toIso = dayjs(to).endOf('day').toISOString();

  // measurements + feature 조인 — RLS는 measurement_features.SELECT 정책에서 처리
  const { data } = await supabase
    .from('measurement_features')
    .select('value_numeric, measurement:measurements!inner(id, user_id, type, started_at, deleted_at)')
    .eq('feature_key', featureKey)
    .eq('measurement.user_id', userId)
    .eq('measurement.type', type)
    .is('measurement.deleted_at', null)
    .gte('measurement.started_at', fromIso)
    .lte('measurement.started_at', toIso);

  const dayList = eachDay(from, to);
  const map: Record<string, number[]> = {};
  for (const d of dayList) map[d] = [];
  for (const row of (data ?? []) as any[]) {
    const m = row.measurement;
    if (!m || !m.started_at) continue;
    const day = dayjs(m.started_at).format('YYYY-MM-DD');
    if (!(day in map)) continue;
    const v = Number(row.value_numeric);
    if (!Number.isNaN(v)) map[day].push(v);
  }
  return dayList.map((d) => {
    const arr = map[d];
    if (!arr.length) return { date: d, value: null };
    return {
      date: d,
      value: Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10,
    };
  });
}

/** 손가락 두드리기 일별 평균 tap_count (지난 30일 기본) */
export async function fetchTapTrend(userId: string, days = 30): Promise<DailyPoint[]> {
  return fetchMeasurementTrendByType(userId, 'tap', 'tap_count', days);
}

/** 반응속도 일별 평균 rt_mean_ms (지난 30일 기본) — 값이 작을수록 빠름 */
export async function fetchReactionTrend(userId: string, days = 30): Promise<DailyPoint[]> {
  return fetchMeasurementTrendByType(userId, 'reaction', 'rt_mean_ms', days);
}

/* ──────────────────────────────────────────────────────────────────────────
 * 동적 dose_slot / track_interval 기반 (앱과 동일 모델)
 * ────────────────────────────────────────────────────────────────────────── */

export type ScoreCountsKeyed = ScoreCounts;

/** 동적 컬럼(슬롯 또는 간격)의 메타. */
export type DynKind = { key: string; label: string; sub?: string };

/**
 * 약 복용률 — 활성 dose_slot 별 일별 복용률(%).
 * - 슬롯 목록: 환자의 활성 dose_slots(is_active) 를 time 오름차순. 커스텀 슬롯도 자기 칸.
 * - taken: med_logs 를 dose_slot_id 로 매칭. meal_time=null 이어도 dose_slot_id 로 살린다.
 *   dose_slot_id 도 없는 순수 레거시 기록만 meal_time→슬롯 폴백.
 * - expected(분모): 그 날 활성 슬롯 1개당 1회.
 */
export type SlotAdherence = {
  slots: { key: string; label: string; time: string }[];
  /** slotKey -> DailyPoint[] (활성 슬롯), '__legacy__' 키는 레거시 폴백(슬롯 없는 기록) */
  bySlot: Record<string, DailyPoint[]>;
};

export async function fetchMedicationAdherenceBySlot(
  patientId: string,
  from: string,
  to: string,
): Promise<SlotAdherence> {
  const fromIso = dayjs(from).startOf('day').toISOString();
  const toIso = dayjs(to).endOf('day').toISOString();

  const [slots, { data: logs }] = await Promise.all([
    fetchDoseSlots(patientId),
    supabase.from('med_logs')
      .select('id, taken_at, dose_slot_id, meal_time')
      .eq('patient_id', patientId)
      .gte('taken_at', fromIso)
      .lte('taken_at', toIso),
  ]);

  const days = eachDay(from, to);
  const slotById = new Map<string, DoseSlot>();
  for (const s of slots) slotById.set(s.id, s);

  // meal_time(레거시) → 활성 슬롯 매핑 (라벨/표준 키로)
  const normalizeMeal = (v: any): 'morning' | 'lunch' | 'dinner' | 'bedtime' | null => {
    if (v == null) return null;
    const s = String(v).toLowerCase();
    if (s.includes('morning') || s.includes('아침') || s.includes('breakfast')) return 'morning';
    if (s.includes('lunch') || s.includes('점심')) return 'lunch';
    if (s.includes('dinner') || s.includes('저녁') || s.includes('supper')) return 'dinner';
    if (s.includes('bed') || s.includes('취침') || s.includes('night') || s.includes('sleep')) return 'bedtime';
    return null;
  };
  const slotKeyForMeal: Record<string, string | undefined> = {};
  for (const s of slots) {
    // DB 의 label(한글)은 비어 있다 — 언어 무관 키로 맞춘다.
    const mk = normalizeMeal(s.legacyKey);
    if (mk && !slotKeyForMeal[mk]) slotKeyForMeal[mk] = s.id;
  }

  // taken[slotId][day]
  const taken: Record<string, Record<string, number>> = {};
  const ensure = (k: string) => { if (!taken[k]) { taken[k] = {}; for (const d of days) taken[k][d] = 0; } };
  for (const s of slots) ensure(s.id);
  ensure('__legacy__');

  for (const log of (logs ?? []) as any[]) {
    const day = dayjs(log.taken_at).format('YYYY-MM-DD');
    if (!days.includes(day)) continue;
    let key: string;
    if (log.dose_slot_id && slotById.has(log.dose_slot_id)) {
      key = log.dose_slot_id;
    } else if (log.dose_slot_id) {
      // 비활성/삭제된 슬롯의 기록 — 레거시 버킷으로 보존(누락 방지)
      key = '__legacy__';
    } else {
      const mk = normalizeMeal(log.meal_time);
      key = (mk && slotKeyForMeal[mk]) || '__legacy__';
    }
    ensure(key);
    taken[key][day] += 1;
  }

  const bySlot: Record<string, DailyPoint[]> = {};
  for (const s of slots) {
    bySlot[s.id] = days.map((d) => {
      const t = taken[s.id]?.[d] ?? 0;
      // 활성 슬롯은 하루 1회 기대 → 복용 있으면 100, 없으면 0
      return { date: d, value: Math.min(100, t * 100) };
    });
  }
  // 레거시(슬롯 매칭 불가) 기록이 있으면 별도 칸으로 노출 — 누락 방지
  const legacyHas = days.some((d) => (taken['__legacy__']?.[d] ?? 0) > 0);
  if (legacyHas) {
    bySlot['__legacy__'] = days.map((d) => {
      const t = taken['__legacy__']?.[d] ?? 0;
      return { date: d, value: t > 0 ? 100 : null };
    });
  }

  // 표시 라벨은 "{시간대} {시각}"으로 통일(slotDisplayTitle). 매칭용 raw label 은 위 로직에서만 사용.
  const slotMeta = slots.map((s) => ({ key: s.id, label: slotDisplayTitle(s.legacyKey, s.time), time: s.time }));
  if (legacyHas) slotMeta.push({ key: '__legacy__', label: tr('slot.legacyOther'), time: '99:99' });

  return { slots: slotMeta, bySlot };
}

/**
 * 약 복용률 — 전체 일별(%).
 * 기대(분모) = 활성 dose_slots 수(없으면 medications 폴백). 실제 = med_logs row 수.
 * scheduled_times 빈 배열 의존 제거.
 */
export async function fetchMedicationAdherenceDynamic(
  patientId: string,
  from: string,
  to: string,
): Promise<DailyPoint[]> {
  const fromIso = dayjs(from).startOf('day').toISOString();
  const toIso = dayjs(to).endOf('day').toISOString();

  const [slots, { data: logs }, { data: meds }] = await Promise.all([
    fetchDoseSlots(patientId),
    supabase.from('med_logs')
      .select('id, taken_at')
      .eq('patient_id', patientId)
      .gte('taken_at', fromIso)
      .lte('taken_at', toIso),
    supabase.from('medications')
      .select('id, scheduled_times, meal_times, created_at, ended_at')
      .eq('patient_id', patientId),
  ]);

  const days = eachDay(from, to);
  const activeSlotCount = slots.length;

  const takenByDay: Record<string, number> = {};
  for (const d of days) takenByDay[d] = 0;
  for (const log of (logs ?? []) as any[]) {
    const day = dayjs(log.taken_at).format('YYYY-MM-DD');
    if (day in takenByDay) takenByDay[day] += 1;
  }

  return days.map((d) => {
    let exp = activeSlotCount;
    if (exp === 0) {
      // dose_slots 없는 레거시 환자 — medications 로 폴백
      const dayEnd = dayjs(d).endOf('day');
      const dayStart = dayjs(d).startOf('day');
      for (const m of (meds ?? []) as any[]) {
        const start = m.created_at ? dayjs(m.created_at) : null;
        const end = m.ended_at ? dayjs(m.ended_at) : null;
        const active = (!start || start.isBefore(dayEnd)) && (!end || end.isAfter(dayStart));
        if (!active) continue;
        exp += (Array.isArray(m.scheduled_times) && m.scheduled_times.length > 0) ? m.scheduled_times.length
          : (Array.isArray(m.meal_times) && m.meal_times.length > 0) ? m.meal_times.length : 3;
      }
    }
    if (exp === 0) return { date: d, value: null };
    return { date: d, value: Math.min(100, Math.round((takenByDay[d] / exp) * 100)) };
  });
}

/**
 * 약효추적 — 동적 간격(track_intervals)별, 항목(body/mood)별 일별 점수 카운트.
 * - 간격 목록: fetchTrackIntervals (활성·추적 슬롯 track_intervals ∪ 데이터 존재 간격), 오름차순.
 * - trigger_time_label → parseTriggerMinutes 로 정확히 분 변환. (60min 정확히 60칸)
 * - 키 형식: `${field}|${minutes}` (예: 'body|0', 'mood|60').
 * - 같은 (날짜, 키)에서 마지막 logged_at 1건만 사용(기존 fetchSymptomSlotScores 정책 동일).
 */
export type IntervalDynData = {
  intervals: number[];
  /** intervalKey('body|0' 등) -> 일별 ScoreCounts */
  scores: Record<string, SlotDayScoreRow[]>;
  /** intervalKey -> 일별 {total,on,off} */
  stats: Record<string, SlotDayStatRow[]>;
};
export type SlotDayScoreRow = { date: string; counts: ScoreCounts };
export type SlotDayStatRow = { date: string; total: number; on: number; off: number };

export function intervalKey(field: 'body' | 'mood', minutes: number): string {
  return `${field}|${minutes}`;
}
export function intervalLabelFull(field: 'body' | 'mood', minutes: number): string {
  return tr('field.withInterval', {
    field: tr(field === 'body' ? 'field.bodyState' : 'field.mood'),
    interval: formatIntervalLabel(minutes),
  });
}

export async function fetchSymptomIntervalsDynamic(
  patientId: string,
  from: string,
  to: string,
): Promise<IntervalDynData> {
  const fromIso = dayjs(from).startOf('day').toISOString();
  const toIso = dayjs(to).endOf('day').toISOString();

  const [intervals, { data }] = await Promise.all([
    fetchTrackIntervals(patientId),
    supabase.from('on_off_logs')
      .select('logged_at, body_state, mood, trigger_time_label, triggered_by')
      .eq('patient_id', patientId)
      .eq('triggered_by', 'notification')
      .gte('logged_at', fromIso)
      .lte('logged_at', toIso),
  ]);

  const days = eachDay(from, to);
  const fields: ('body' | 'mood')[] = ['body', 'mood'];
  const keys: string[] = [];
  for (const f of fields) for (const m of intervals) keys.push(intervalKey(f, m));

  const emptyScore = (): ScoreCounts => ({ c1: 0, c2: 0, c3: 0, c4: 0, c5: 0 });
  const scores: Record<string, SlotDayScoreRow[]> = {};
  const stats: Record<string, SlotDayStatRow[]> = {};
  const scoreMap: Record<string, Record<string, ScoreCounts>> = {};
  const statMap: Record<string, Record<string, { total: number; on: number; off: number }>> = {};
  for (const k of keys) {
    scoreMap[k] = {}; statMap[k] = {};
    for (const d of days) { scoreMap[k][d] = emptyScore(); statMap[k][d] = { total: 0, on: 0, off: 0 }; }
  }

  // 가장 가까운 설정 간격으로 스냅(데이터 간격이 목록에 정확히 없을 때도 누락 방지)
  const snap = (m: number): number => {
    if (intervals.includes(m)) return m;
    let best = intervals[0] ?? m;
    let bestD = Math.abs((intervals[0] ?? m) - m);
    for (const iv of intervals) {
      const d = Math.abs(iv - m);
      if (d < bestD) { bestD = d; best = iv; }
    }
    return best;
  };

  const rows = ((data ?? []) as any[]).slice().sort((a, b) =>
    dayjs(a.logged_at).valueOf() - dayjs(b.logged_at).valueOf());

  // stats 는 모든 기록 누적, scores 는 (날짜,키) 마지막 1건
  const lastScore: Record<string, number> = {};
  for (const row of rows) {
    const day = dayjs(row.logged_at).format('YYYY-MM-DD');
    if (!days.includes(day)) continue;
    const mins = parseTriggerMinutes(row.trigger_time_label);
    if (mins == null) continue; // 분류 불가 기록은 제외(임의 버킷 오분류 방지)
    const m = snap(mins);

    for (const f of fields) {
      const raw = f === 'body' ? row.body_state : row.mood;
      if (raw == null) continue;
      const v = Number(raw);
      if (Number.isNaN(v)) continue;
      const k = intervalKey(f, m);
      if (!(k in statMap)) continue;
      // stats: 모든 기록
      statMap[k][day].total += 1;
      if (v >= 4) statMap[k][day].on += 1;
      else if (v <= 2) statMap[k][day].off += 1;
      // scores: 마지막 1건
      if (v >= 1 && v <= 5) lastScore[`${day}|${k}`] = Math.round(v);
    }
  }
  for (const compound of Object.keys(lastScore)) {
    const idx = compound.indexOf('|');
    const day = compound.slice(0, idx);
    const k = compound.slice(idx + 1);
    const v = lastScore[compound];
    if (scoreMap[k]?.[day]) (scoreMap[k][day] as any)['c' + v] += 1;
  }

  for (const k of keys) {
    scores[k] = days.map((d) => ({ date: d, counts: scoreMap[k][d] }));
    stats[k] = days.map((d) => ({ date: d, total: statMap[k][d].total, on: statMap[k][d].on, off: statMap[k][d].off }));
  }

  return { intervals, scores, stats };
}

/** ScoreDayRow[] → 슬롯별 단일 점수값(1~5/null) (slotScoresToSingle 의 키드 버전) */
export function scoreRowsToSingle(rows: SlotDayScoreRow[]): { date: string; score: number | null }[] {
  return rows.map((r) => {
    let score: number | null = null;
    for (let i = 5; i >= 1; i--) {
      if ((r.counts as any)['c' + i] > 0) { score = i; break; }
    }
    return { date: r.date, score };
  });
}

export async function fetchMedicationChanges(patientId: string, from: string, to: string): Promise<MedChange[]> {
  const fromIso = dayjs(from).startOf('day').toISOString();
  const toIso = dayjs(to).endOf('day').toISOString();
  const { data } = await supabase.from('medications')
    .select('name, created_at, ended_at')
    .eq('patient_id', patientId);
  const out: MedChange[] = [];
  for (const m of (data ?? []) as any[]) {
    if (m.created_at && m.created_at >= fromIso && m.created_at <= toIso) {
      out.push({ date: dayjs(m.created_at).format('YYYY-MM-DD'), label: tr('med.added', { name: m.name }) });
    }
    if (m.ended_at && m.ended_at >= fromIso && m.ended_at <= toIso) {
      out.push({ date: dayjs(m.ended_at).format('YYYY-MM-DD'), label: tr('med.stopped', { name: m.name }) });
    }
  }
  return out;
}
