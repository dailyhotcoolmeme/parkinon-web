import { supabase } from './supabase';
import { isEnLang } from '../i18n/currentLang';

/**
 * 앱(dose_slots / track_intervals / trigger_time_label)과 동일한 복용 슬롯·약효추적 간격 모델.
 *
 * - dose_slots: 환자가 직접 만든 복용 시점(아침/점심/저녁/취침 + "오후 3:00" 같은 커스텀).
 * - track_intervals(int[]): 각 슬롯에서 약효추적할 간격(분). 0=복용 직후, 30=30분 후, 60=1시간, 120=2시간.
 * - on_off_logs.trigger_time_label: 약효추적 기록이 "복용 후 몇 분" 시점인지. 영문 키.
 *
 * 정확성 최우선: trigger_time_label 은 includes 문자열 매칭(레거시)을 폐기하고
 * 정규식으로 정확히 분으로 변환한다. (60min_after 가 "복용 직후"로 오분류되던 버그 해소)
 */

export type DoseSlot = {
  id: string;
  label: string;
  /** "HH:MM" 형식 (정렬·표시용) */
  time: string;
  trackIntervals: number[];
  trackEnabled: boolean;
  isActive: boolean;
  sortOrder: number;
};

/**
 * trigger_time_label(영문 키) → 분.
 *   after_medication = 0 (복용 직후)
 *   {N}min_after     = N
 *   {N}hour_after    = N * 60
 * 매칭 실패 시 null (분류에서 제외 → 임의 버킷에 오분류되지 않게).
 */
export function parseTriggerMinutes(label: string | null | undefined): number | null {
  if (label == null) return null;
  const s = String(label).trim();
  if (s === '' ) return null;
  if (s === 'after_medication') return 0;
  const minMatch = s.match(/^(\d+)min_after$/);
  if (minMatch) return parseInt(minMatch[1], 10);
  const hourMatch = s.match(/^(\d+)hour_after$/);
  if (hourMatch) return parseInt(hourMatch[1], 10) * 60;
  return null;
}

/**
 * 분 → 약효추적 간격 표시 라벨 (앱 minutesToLabel 과 동일 규칙).
 *   0 → "복용 직후", <60 → "N분 후", 60의 배수 → "N시간 후", 그 외 → "N시간 M분 후"
 */
export function formatIntervalLabel(minutes: number): string {
  if (isEnLang()) {
    if (minutes <= 0) return 'right after taking';
    if (minutes < 60) return `${minutes} min after`;
    const h = Math.floor(minutes / 60);
    const rem = minutes % 60;
    return rem === 0 ? `${h} hr after` : `${h} hr ${rem} min after`;
  }
  if (minutes <= 0) return '복용 직후';
  if (minutes < 60) return `${minutes}분 후`;
  const h = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${h}시간 후` : `${h}시간 ${rem}분 후`;
}

/** 표준 복용 라벨(시각이 라벨에 포함돼 있지 않은 것). 앱 slotTitle 로직과 동일. */
const STANDARD_SLOT_LABELS = new Set(['아침', '점심', '저녁', '취침']);
// 표준 라벨 표시명 영문화 — 앱(medUtils.ts EN_MEAL_PERIOD)과 동일 어휘로 통일.
const EN_STANDARD_SLOT_LABELS: Record<string, string> = {
  '아침': 'Morning', '점심': 'Lunch', '저녁': 'Dinner', '취침': 'Bedtime',
};

/**
 * "HH:MM"(24시간) → 12시간제 "H:MM" (오전/오후 없이).
 *   08:00→"8:00", 12:00→"12:00", 18:00→"6:00", 22:30→"10:30", 00:00→"12:00".
 * 분은 그대로 유지(:00, :30).
 */
function formatClock12(time: string): string | null {
  const m = String(time ?? '').match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2];
  if (Number.isNaN(h)) return null;
  h = h % 12;
  if (h === 0) h = 12; // 0시/12시 → 12
  return `${h}:${min}`;
}

/**
 * 복용 슬롯 표시 제목 (앱 slotTitle 로직과 동일).
 * - 표준 라벨(아침/점심/저녁/취침): "{label} {시각}" → "아침 8:00", "저녁 6:00".
 * - 비표준 라벨(이미 시각 포함, 예 "오후 3:00","밤 10:30"): 라벨 그대로(시각 중복 방지).
 * - time 데이터가 없는 레거시 슬롯: 라벨만(시각 못 붙이면 폴백).
 */
export function slotDisplayTitle(label: string | null | undefined, time?: string | null): string {
  const raw = String(label ?? '').trim();
  if (!STANDARD_SLOT_LABELS.has(raw)) return raw;
  const display = isEnLang() ? (EN_STANDARD_SLOT_LABELS[raw] ?? raw) : raw;
  const clock = formatClock12(time ?? '');
  return clock ? `${display} ${clock}` : display;
}

/** "HH:MM:SS" / "HH:MM" / Date → "HH:MM" */
function normalizeTime(t: any): string {
  const s = String(t ?? '');
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (!m) return '00:00';
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * 환자의 활성 복용 슬롯(is_active=true)을 time 오름차순으로.
 * 커스텀 슬롯("오후 3:00" 등)도 자기 자리로 포함.
 */
export async function fetchDoseSlots(patientId: string): Promise<DoseSlot[]> {
  const { data } = await supabase
    .from('dose_slots')
    .select('id, label, time, track_intervals, track_enabled, is_active, sort_order')
    .eq('patient_id', patientId);
  const slots = ((data ?? []) as any[])
    .filter((r) => r.is_active !== false)
    .map((r): DoseSlot => ({
      id: r.id,
      label: r.label ?? '',
      time: normalizeTime(r.time),
      trackIntervals: Array.isArray(r.track_intervals)
        ? r.track_intervals.map((n: any) => Number(n)).filter((n: number) => !Number.isNaN(n))
        : [],
      trackEnabled: r.track_enabled !== false,
      isActive: r.is_active !== false,
      sortOrder: Number(r.sort_order ?? 0),
    }));
  slots.sort((a, b) => {
    const dt = timeToMinutes(a.time) - timeToMinutes(b.time);
    if (dt !== 0) return dt;
    return a.sortOrder - b.sortOrder;
  });
  return slots;
}

/**
 * 약효추적 간격(분) 동적 목록.
 * - 활성·추적 슬롯들의 track_intervals 합집합  ∪  실제 데이터(on_off_logs)에 존재하는 간격
 *   → 설정 변경 전 기록도 누락 0. (track_intervals 기반 + 기록 보존을 양립)
 * - 오름차순 정렬, 중복 제거. 데이터/설정이 전혀 없으면 [0] 보장(복용 직후).
 */
export async function fetchTrackIntervals(patientId: string): Promise<number[]> {
  const [slots, { data: oo }] = await Promise.all([
    fetchDoseSlots(patientId),
    supabase
      .from('on_off_logs')
      .select('trigger_time_label, triggered_by')
      .eq('patient_id', patientId)
      .eq('triggered_by', 'notification'),
  ]);

  const set = new Set<number>();
  for (const s of slots) {
    if (!s.trackEnabled) continue;
    for (const m of s.trackIntervals) set.add(m);
  }
  for (const row of (oo ?? []) as any[]) {
    const m = parseTriggerMinutes(row.trigger_time_label);
    if (m != null) set.add(m);
  }
  if (set.size === 0) set.add(0);
  return Array.from(set).sort((a, b) => a - b);
}
