import { useCallback, useEffect, useMemo, useState } from 'react';

// 파킨온 운영자용 신고 검토·조치 관리자 페이지.
// 인증/RPC는 전부 Cloudflare Pages Function(/api/admin/*) 경유. service_role 키는 서버에만 존재.
// 디자인: myamen-pastor 관리자 톤(콤팩트·전문적). 기능/엔드포인트는 일절 변경하지 않음.

const TOKEN_KEY = 'parkinon-admin-token';
const AUTO_HIDE_THRESHOLD = 3;

interface ReportRow {
  target_type: string;
  target_id: string;
  report_count: number;
  reasons: string[] | null;
  last_reported_at: string | null;
  content_preview: string | null;
  author_id: string | null;
  author_name: string | null;
  author_banned?: boolean;
  hidden: boolean;
  hidden_reason: string | null;
  hidden_at: string | null;
  resolved?: boolean;
  media_urls?: string[]; // 게시물 첨부 사진(워커 프록시 토큰 URL). 게시글만, 없으면 빈 배열/undefined.
}

type ReportStatus = 'open' | 'resolved';
type AdminView = 'reports' | 'devletter' | 'users' | 'notices' | 'allposts';

// 빈 줄(문단 사이) 기준 문단 수 — 앱과 동일 규칙.
function countParagraphs(text: string): number {
  return text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean).length;
}

function targetLabel(t: string): string {
  if (t === 'post') return '게시글';
  if (t === 'comment') return '댓글';
  return t;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
function fmtTime(iso: string | null): string {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    const yy = String(d.getFullYear()).slice(-2);
    const mo = d.getMonth() + 1;
    const day = d.getDate();
    const dow = WEEKDAYS[d.getDay()];
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = h < 12 ? '오전' : '오후';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return `${yy}.${mo}.${day}(${dow}) ${ampm} ${h12}:${m}`;
  } catch {
    return iso;
  }
}

// ── 사용자 현황 헬퍼 ──
const ACTION_LABELS: Record<string, string> = {
  screen_view: '화면 이동',
  app_foreground: '앱 열기',
  login: '로그인',
  logout: '로그아웃',
  med_taken: '약 복용',
  bodystate_saved: '몸상태·기분 기록',
  exercise_saved: '운동 기록',
};
function actionLabel(a: string): string {
  return ACTION_LABELS[a] || a;
}

// ── 알림 수신 상태 ──
// 파킨온은 알림이 핵심이라 "누가 못 받고 있는지"를 한눈에 봐야 한다.
// 서버(admin_user_list)가 push_token 유무 + 앱 내 알림 설정으로 3가지로 판정해 내려준다.
// 기기 설정 차단과 권한 미요청은 서버에서 구분할 수 없어 '토큰 없음' 하나로 합쳤다.
const PUSH_STATES: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  receiving: { label: '받는 중', color: '#2e7d32', bg: '#E8F5E9', desc: '알림 정상 수신' },
  app_off:   { label: '앱에서 끔', color: '#b45309', bg: '#FEF3C7', desc: '앱 내 설정에서 알림을 끔' },
  no_token:  { label: '토큰 없음', color: '#b91c1c', bg: '#FEE2E2', desc: '권한 거부·미요청이거나 토큰 만료 — 알림이 전혀 가지 않음' },
};
function pushState(s: string) {
  return PUSH_STATES[s] ?? { label: s || '알 수 없음', color: '#475569', bg: '#f1f5f9', desc: '' };
}

// 목록 정렬용 값 추출. 문자열/숫자/날짜를 비교 가능한 형태로 통일한다.
function userSortValue(u: any, key: string): string | number {
  switch (key) {
    case 'name':        return (u.name || '').toLowerCase();
    case 'role':        return u.role || '';
    case 'created_at':  return u.created_at ? new Date(u.created_at).getTime() : 0;
    case 'last_active': return u.last_active ? new Date(u.last_active).getTime() : 0;
    case 'push_state':  return u.push_state || '';
    case 'actions_total': return Number(u.actions_total || 0);
    default:            return 0;
  }
}

// 앱 내부 화면 라우트명(영문) → 관리자 표시용 한글. RootNavigator 등 전체 name= 목록 기준.
const SCREEN_LABELS: Record<string, string> = {
  Alarm: '알람 화면',
  AlarmSoundSettings: '알림음 설정',
  AppointmentWrite: '진료 일정 작성',
  BlockedUsers: '차단 사용자 관리',
  BodyState: '몸상태',
  BodyStateTab: '몸상태 탭',
  CaregiverInfo: '보호자 정보 입력',
  CaregiverMeasurement: '보호자 검사',
  Diary: '일기',
  Exercise: '운동',
  ExerciseDuration: '운동 시간 선택',
  ExerciseMain: '운동 메인',
  ExerciseRecord: '운동 기록',
  ExerciseVideo: '운동 영상 목록',
  ExerciseVideoPlayer: '운동 영상 재생',
  FamilyCheck: '가족 확인',
  FamilyInvite: '가족 초대',
  FamilyLink: '가족 연동',
  Feed: '정보·나눔',
  FeedMain: '정보·나눔 메인',
  Login: '로그인',
  Main: '메인(탭)',
  MeasurementConsent: '검사 동의',
  MeasurementMenu: '검사 메뉴',
  MeasurementRecords: '검사 기록',
  MeasurementResult: '검사 결과',
  MedicalRecordDetail: '진료기록 상세',
  MedicalRecordList: '진료기록 목록',
  MedicalRecordWrite: '진료기록 작성',
  Medication: '약복용',
  MedicationManage: '약 관리',
  MedTimeOnboarding: '복용시간 온보딩',
  MenuHome: '메뉴',
  MyInfo: '내 정보',
  NotificationHistory: '알림 내역',
  OnboardingAuth: '로그인(온보딩)',
  OnboardingGuest: '온보딩(비로그인)',
  OnboardingSlide: '온보딩 슬라이드',
  OverseasMedTab: '해외 복약 탭',
  PatientInfo: '환자 정보 입력',
  PostDetail: '게시글 상세',
  PostWrite: '게시글 작성',
  Privacy: '개인정보처리방침',
  ProfileEdit: '프로필 수정',
  ReactionGame: '반응속도 검사',
  RecordDetail: '기록 상세',
  Records: '기록 보기',
  RecordSound: '알림음 녹음',
  RoleSelect: '역할 선택',
  SensitiveInfoConsent: '민감정보 동의',
  Settings: '설정',
  Splash: '스플래시',
  SubscriptionManage: '구독 관리',
  TapGame: '탭 반응 검사',
  Terms: '이용약관',
  VideoList: '영상 목록',
  VideoRecord: '영상 기록',
};
function screenLabel(s: string | null | undefined): string {
  if (!s) return '-';
  return SCREEN_LABELS[s] || s;
}

const MEAL_TIME_LABELS: Record<string, string> = {
  morning: '아침', lunch: '점심', dinner: '저녁', bedtime: '취침',
};
const TRIGGERED_BY_LABELS: Record<string, string> = {
  notification: '알림 응답', manual: '수동 입력',
};
const EXERCISE_TYPE_LABELS: Record<string, string> = {
  walk: '걷기', strength: '근력', balance: '균형', stretch: '스트레칭',
  bike: '자전거', swim: '수영', dance: '댄스', boxing: '복싱', yoga: '요가', jog: '조깅',
};
// 약효추적 trigger_time_label('after_medication'/'30min_after'/'2hour_after' 등) → 한글.
function triggerLabelKo(label: string): string {
  if (label === 'after_medication') return '복용 직후';
  if (label === '2hour_after') return '2시간 후';
  const m = /^(\d+)min_after$/.exec(label);
  if (m) return `${m[1]}분 후`;
  return label;
}

// "상세" 컬럼 — action 별 detail(JSON)을 관리자가 읽을 수 있는 한글 요약으로.
function formatDetail(action: string, detail: any): string {
  if (!detail) return '';
  switch (action) {
    case 'screen_view':
      // 화면 컬럼과 중복(같은 라우트명)이라 상세는 비움.
      return '';
    case 'med_taken': {
      const meal = detail.meal_time ? MEAL_TIME_LABELS[detail.meal_time] || detail.meal_time : null;
      return meal ? `${meal} 슬롯` : '-';
    }
    case 'bodystate_saved': {
      const parts: string[] = [];
      if (detail.body_state != null) parts.push(`몸상태 ${detail.body_state}`);
      if (detail.mood != null) parts.push(`기분 ${detail.mood}`);
      if (detail.sleep_quality != null) parts.push(`수면 ${detail.sleep_quality}`);
      if (detail.constipation != null) parts.push(`변비 ${detail.constipation ? '있음' : '없음'}`);
      if (detail.trigger_time_label) parts.push(triggerLabelKo(detail.trigger_time_label));
      if (detail.triggered_by) parts.push(TRIGGERED_BY_LABELS[detail.triggered_by] || detail.triggered_by);
      return parts.join(' · ') || '-';
    }
    case 'exercise_saved': {
      const type = detail.exercise_type ? (EXERCISE_TYPE_LABELS[detail.exercise_type] || detail.exercise_type) : '-';
      const dur = detail.duration_minutes != null ? `${detail.duration_minutes}분` : '';
      return [type, dur].filter(Boolean).join(' · ');
    }
    default:
      return JSON.stringify(detail);
  }
}
function roleLabel(r: string | null): string {
  return r === 'patient' ? '환자' : r === 'caregiver' ? '보호자' : (r || '-');
}
// 환자+보호자를 group_id 로 세트 묶음. 세트는 최근 활동 순.
// 환자+보호자를 그룹 단위 세트로 묶는다.
// ⚠️ 세트 순서는 rows 로 들어온 순서를 그대로 따른다(각 세트의 첫 등장 위치 기준).
//    예전엔 여기서 last_active 로 다시 정렬해, 호출부에서 어떤 정렬을 골라도
//    화면은 항상 "최근 활동순"으로 나왔다(오너 제보 2026-07-28).
//    정렬 기준은 호출부(visibleUserRows)가 정한다.
function groupSets(rows: any[]): { group_id: string | null; members: any[] }[] {
  const byGroup = new Map<string, any[]>();
  const order: (string | null)[] = []; // 세트 등장 순서
  const singles: { key: string; row: any }[] = [];
  rows.forEach((r, i) => {
    if (r.group_id) {
      if (!byGroup.has(r.group_id)) {
        byGroup.set(r.group_id, []);
        order.push(r.group_id);
      }
      byGroup.get(r.group_id)!.push(r);
    } else {
      const key = `__single_${i}`;
      singles.push({ key, row: r });
      order.push(key);
    }
  });
  const singleByKey = new Map(singles.map((s) => [s.key, s.row]));
  return order.map((key) => {
    if (key && byGroup.has(key)) {
      const members = [...byGroup.get(key)!];
      // 세트 안에서는 환자를 위로.
      members.sort((a, b) => (a.role === 'patient' ? 0 : 1) - (b.role === 'patient' ? 0 : 1));
      return { group_id: key, members };
    }
    return { group_id: null, members: [singleByKey.get(key as string)] };
  });
}

async function api(path: string, opts: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem(TOKEN_KEY) || '';
  return fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
}

// ── 콤팩트 관리자 스타일 (parkinon 전역 18px/56px 버튼을 이 페이지에서만 축소) ──
const ADMIN_CSS = `
.adm { color: #1a1a1a; }
.adm * { box-sizing: border-box; }
.adm-page { min-height: 100vh; background: #f6f8f6; }
.adm-header { background: #fff; border-bottom: 1px solid #e5e7eb; }
.adm-header-inner {
  max-width: 1120px; margin: 0 auto; padding: 14px 20px;
  display: flex; align-items: center; gap: 12px;
}
.adm-title { font-size: 16px; font-weight: 700; margin: 0; color: #1a1a1a; flex-shrink: 0; white-space: nowrap; }
.adm-main { max-width: 1120px; margin: 0 auto; padding: 20px; }

/* 버튼 — 전역 56px 규칙을 덮어씀. myamen-pastor 보조버튼(text-xs 12px / px-3 py-1.5 ≈ 28px) 기준 */
.adm button {
  font-family: inherit; font-size: 13px; font-weight: 500;
  min-height: 0; height: 24px; padding: 0 11px; line-height: 1;
  border-radius: 8px; border: 1px solid transparent;
  background: #4CAF50; color: #fff; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
}
.adm button:hover { background: #388E3C; }
.adm button:disabled { opacity: .5; cursor: default; }
.adm button.adm-ghost { background: #fff; color: #374151; border-color: #e5e7eb; }
.adm button.adm-ghost:hover { background: #f6f8f6; }
.adm button.adm-danger { background: #fff; color: #c62828; border-color: #f3c6c6; }
.adm button.adm-danger:hover { background: #fdecec; }
.adm button.adm-sm { height: 24px; padding: 0 11px; font-size: 13px; }
.adm button.adm-warn { background: #e65100; color: #fff; }
.adm button.adm-warn:hover { background: #d84315; }

.adm-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; }
.adm-note {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
  padding: 12px 14px; font-size: 13px; color: #475569; line-height: 1.6;
}
.adm-note b { color: #1a1a1a; }

.adm-input {
  font-family: inherit; font-size: 14px; height: 42px;
  padding: 0 12px; width: 100%;
  border-radius: 8px; border: 1px solid #e5e7eb; background: #fff; color: #1a1a1a;
}
.adm-input:focus { outline: none; border-color: #4CAF50; }
.adm-input::placeholder { color: #9ca3af; }

.adm-chip {
  display: inline-flex; align-items: center;
  height: 24px; font-size: 13px; font-weight: 400; padding: 0 11px; border-radius: 999px;
  white-space: nowrap; line-height: 1;
}

.adm-check {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 13px; color: #374151; cursor: pointer; user-select: none;
}
.adm-check input { accent-color: #4CAF50; width: 15px; height: 15px; }

/* 진행중/종결 탭 — myamen-pastor 설교 보관함 탭과 동형(underline). 색만 그린.
   myamen: flex gap-1(4px) border-b / 탭 -mb-px border-b-2 px-4(16) py-2(8) text-sm(14) font-semibold(600) */
.adm-tabs { display: flex; gap: 4px; border-bottom: 1px solid #e5e7eb; }
/* 전역 .adm button(녹색·둥근모서리)을 덮으려면 .adm button.adm-tab 로 우선순위를 올려야 함 */
.adm button.adm-tab {
  font-family: inherit; font-size: 14px; font-weight: 600; line-height: 1.2;
  background: none; border: none; color: #6b7280; cursor: pointer;
  padding: 8px 16px; margin-bottom: -1px;
  border-bottom: 2px solid transparent; border-radius: 0;
  display: inline-flex; align-items: center; gap: 6px; height: auto; min-height: 0;
  transition: color .15s, border-color .15s;
}
.adm button.adm-tab:hover { color: #374151; background: none; }
.adm button.adm-tab.is-active { color: #2e7d32; border-bottom-color: #4CAF50; background: none; }

/* 항상 가로 스크롤(모바일에서 숨기지 않음) — .adm-tablewrap 은 760px 이하에서 display:none 되므로
   좁은 화면에서도 계속 보여야 하는 테이블(사용자 활동 타임라인 등)은 이걸 쓴다. 스크롤바는 숨김. */
.adm-scrollx { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; -ms-overflow-style: none; }
.adm-scrollx::-webkit-scrollbar { display: none; }

/* 데스크탑 테이블 — myamen-pastor 기준: 본문 14px(text-sm), 헤더 12px(text-xs)/weight 500/패딩 12px 8px */
.adm-table { width: 100%; min-width: 640px; border-collapse: collapse; font-size: 13px; }
.adm-table thead th {
  text-align: left; font-weight: 500; font-size: 13px; color: #6b7280;
  padding: 8px 12px; border-bottom: 1px solid #e5e7eb; white-space: nowrap;
}
.adm-table tbody td { padding: 8px 12px; border-bottom: 1px solid #f1f3f1; vertical-align: middle; }
.adm-table tbody tr:last-child td { border-bottom: none; }
.adm-table tbody tr.is-hidden { background: #fafafa; color: #6b7280; }
.adm-preview {
  font-size: 13px; color: #1a1a1a; line-height: 1.55;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
  overflow: hidden; white-space: pre-wrap; word-break: break-word; max-width: 360px;
}
.adm-meta { font-size: 13px; color: #6b7280; line-height: 1.5; }
.adm-actions { display: flex; gap: 6px; flex-wrap: wrap; }

.adm-empty { text-align: center; color: #9ca3af; font-size: 14px; padding: 40px 12px; }
.adm-err { color: #c62828; font-size: 13px; word-break: break-all; }

/* 카드뷰(모바일) 기본 숨김 / 테이블은 기본 표시 */
.adm-cards { display: none; }
@media (max-width: 760px) {
  .adm-tablewrap { display: none; }
  .adm-cards { display: flex; flex-direction: column; gap: 10px; }
  .adm-header-inner, .adm-main { padding-left: 14px; padding-right: 14px; }
}
.adm-rowcard { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
.adm-rowcard.is-hidden { background: #fafafa; }

/* 상단 뷰 전환 내비 (신고 검토 / 개발자 일기) — 탭이 늘어나 좁은 화면에서 넘칠 때 세로 글자쪼개짐 대신 가로 스크롤(스크롤바 숨김) */
.adm-nav {
  display: flex; gap: 4px; flex: 1; min-width: 0;
  overflow-x: auto; -webkit-overflow-scrolling: touch;
  scrollbar-width: none; -ms-overflow-style: none;
}
.adm-nav::-webkit-scrollbar { display: none; }
.adm button.adm-nav-btn {
  font-family: inherit; font-size: 14px; font-weight: 600; line-height: 1.2;
  background: none; border: 1px solid transparent; color: #6b7280; cursor: pointer;
  padding: 6px 12px; border-radius: 8px; height: auto; min-height: 0;
  white-space: nowrap; flex-shrink: 0;
}
.adm button.adm-nav-btn:hover { color: #374151; background: #f6f8f6; }
.adm button.adm-nav-btn.is-active { color: #2e7d32; background: #e8f5e9; }

/* 개발자 일기 편집기 */
.adm-dl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 860px) { .adm-dl-grid { grid-template-columns: 1fr; } }
.adm-dl-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; }
.adm-dl-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.adm-dl-lang { font-size: 15px; font-weight: 700; color: #1a1a1a; }
.adm-dl-count { font-size: 12px; color: #6b7280; }
.adm-textarea {
  font-family: inherit; font-size: 14px; line-height: 1.7; color: #1a1a1a;
  width: 100%; min-height: 440px; resize: vertical;
  padding: 12px 14px; border-radius: 8px; border: 1px solid #e5e7eb; background: #fff;
  white-space: pre-wrap;
}
.adm-textarea:focus { outline: none; border-color: #4CAF50; }
`;

export default function Admin() {
  const [authed, setAuthed] = useState<boolean>(!!localStorage.getItem(TOKEN_KEY));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);

  const [view, setView] = useState<AdminView>('reports'); // 신고 검토 / 개발자 일기

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [onlyVisible, setOnlyVisible] = useState(false);
  const [status, setStatus] = useState<ReportStatus>('open'); // 진행중/종결 탭
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // 개발자 일기 편집 상태
  const [dlKo, setDlKo] = useState('');
  const [dlEn, setDlEn] = useState('');
  // 마지막 서명 줄(예: "2026년 7월 3일 개발자 올림") — 앱에선 항상 서명 스타일로 렌더됨.
  const [dlSigKo, setDlSigKo] = useState('');
  const [dlSigEn, setDlSigEn] = useState('');
  const [dlLoaded, setDlLoaded] = useState(false);
  const [dlLoading, setDlLoading] = useState(false);
  const [dlSaving, setDlSaving] = useState(false);
  const [dlErr, setDlErr] = useState('');
  const [dlSavedMsg, setDlSavedMsg] = useState('');

  // 사용자 현황 상태
  const [userRows, setUserRows] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [usersErr, setUsersErr] = useState('');
  // 검색어(이름) · 알림상태 필터 · 정렬
  const [userQuery, setUserQuery] = useState('');
  const [pushFilter, setPushFilter] = useState<'all' | 'receiving' | 'app_off' | 'no_token'>('all');
  const [userSort, setUserSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'last_active', dir: 'desc' });

  // 검색어·알림상태 필터·정렬을 적용한 목록. 세트 묶음은 이 결과를 groupSets 로 감싸 만든다.
  const visibleUserRows = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    const rows = userRows.filter((u) => {
      if (pushFilter !== 'all' && u.push_state !== pushFilter) return false;
      if (q && !String(u.name || '').toLowerCase().includes(q)) return false;
      return true;
    });
    const { key, dir } = userSort;
    return [...rows].sort((a, b) => {
      const va = userSortValue(a, key);
      const vb = userSortValue(b, key);
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [userRows, userQuery, pushFilter, userSort]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // 정보·나눔 탭 공지글 관리 상태
  const [noticeRows, setNoticeRows] = useState<any[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(false);
  const [noticesLoaded, setNoticesLoaded] = useState(false);
  const [noticesErr, setNoticesErr] = useState('');
  const [ntTitle, setNtTitle] = useState('');
  const [ntContent, setNtContent] = useState('');
  const [ntAuthor, setNtAuthor] = useState('');
  const [ntSaving, setNtSaving] = useState(false);
  const [ntBusyKey, setNtBusyKey] = useState<string | null>(null);
  const [ntEditingId, setNtEditingId] = useState<string | null>(null);
  const [ntEditTitle, setNtEditTitle] = useState('');
  const [ntEditContent, setNtEditContent] = useState('');
  const [ntEditAuthor, setNtEditAuthor] = useState('');
  const [ntEditSaving, setNtEditSaving] = useState(false);

  // 정보·나눔 일반 게시글 관리 상태(공지 제외 — 전체 열람+수정/삭제/숨김)
  const [apRows, setApRows] = useState<any[]>([]);
  const [apLoading, setApLoading] = useState(false);
  const [apLoaded, setApLoaded] = useState(false);
  const [apErr, setApErr] = useState('');
  const [apQuery, setApQuery] = useState('');
  const [apBusyKey, setApBusyKey] = useState<string | null>(null);
  const [apEditingId, setApEditingId] = useState<string | null>(null);
  const [apEditTitle, setApEditTitle] = useState('');
  const [apEditContent, setApEditContent] = useState('');
  const [apEditSaving, setApEditSaving] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthed(false);
    setRows([]);
    setDlLoaded(false);
    setDlKo('');
    setDlEn('');
    setDlSigKo('');
    setDlSigEn('');
    setNoticesLoaded(false);
    setNoticeRows([]);
    setNtEditingId(null);
    setApLoaded(false);
    setApRows([]);
  }, []);

  const loadDevLetter = useCallback(async () => {
    setDlLoading(true);
    setDlErr('');
    setDlSavedMsg('');
    try {
      const res = await api('/api/admin/dev-letter');
      if (res.status === 401) { logout(); return; }
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `오류 ${res.status}`);
      setDlKo(body.body_ko || '');
      setDlEn(body.body_en || '');
      setDlSigKo(body.signature_ko || '');
      setDlSigEn(body.signature_en || '');
      setDlLoaded(true);
    } catch (e) {
      setDlErr(String(e instanceof Error ? e.message : e));
    } finally {
      setDlLoading(false);
    }
  }, [logout]);

  async function saveDevLetter(force: boolean) {
    if (force) {
      const ok = window.confirm(
        '저장하고, 예전에 "다시 보지 않기"를 누른 사용자에게도 팝업을 한 번 더 띄웁니다.\n' +
        '(사용자가 다시 "다시 보지 않기"를 누르면 이후로는 다시 안 뜹니다.)\n\n진행할까요?',
      );
      if (!ok) return;
    }
    setDlSaving(true);
    setDlErr('');
    setDlSavedMsg('');
    try {
      const res = await api('/api/admin/dev-letter', {
        method: 'POST',
        body: JSON.stringify({ body_ko: dlKo, body_en: dlEn, signature_ko: dlSigKo, signature_en: dlSigEn, force }),
      });
      if (res.status === 401) { logout(); return; }
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `오류 ${res.status}`);
      setDlSavedMsg(
        force
          ? '저장 + 강제 노출 설정 완료. 예전에 닫은 사용자도 다음 앱 실행 때 팝업을 다시 보게 됩니다.'
          : '저장되었습니다. 팝업이 뜨는 사용자에게만 다음 실행 시 새 문구가 보입니다.',
      );
    } catch (e) {
      setDlErr(String(e instanceof Error ? e.message : e));
    } finally {
      setDlSaving(false);
    }
  }

  // ── 정보·나눔 공지글 ──
  const loadNotices = useCallback(async () => {
    setNoticesLoading(true);
    setNoticesErr('');
    try {
      const res = await api('/api/admin/notices');
      if (res.status === 401) { logout(); return; }
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `오류 ${res.status}`);
      setNoticeRows(body.rows || []);
      setNoticesLoaded(true);
    } catch (e) {
      setNoticesErr(String(e instanceof Error ? e.message : e));
    } finally {
      setNoticesLoading(false);
    }
  }, [logout]);

  async function createNotice() {
    if (!ntTitle.trim() || !ntContent.trim() || !ntAuthor.trim()) {
      window.alert('제목·본문·작성자명을 모두 입력해주세요.');
      return;
    }
    setNtSaving(true);
    setNoticesErr('');
    try {
      const res = await api('/api/admin/notices', {
        method: 'POST',
        body: JSON.stringify({ title: ntTitle, content: ntContent, author_name: ntAuthor }),
      });
      if (res.status === 401) { logout(); return; }
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `오류 ${res.status}`);
      setNtTitle('');
      setNtContent('');
      setNtAuthor('');
      await loadNotices();
    } catch (e) {
      setNoticesErr(String(e instanceof Error ? e.message : e));
    } finally {
      setNtSaving(false);
    }
  }

  async function toggleNoticeHidden(id: string, nextHidden: boolean) {
    setNtBusyKey(id);
    try {
      const res = await api('/api/admin/hide', {
        method: 'POST',
        body: JSON.stringify({
          target_type: 'post',
          target_id: id,
          hidden: nextHidden,
          reason: nextHidden ? '관리자 수동 숨김(공지)' : null,
        }),
      });
      if (res.status === 401) { logout(); return; }
      if (!res.ok) throw new Error((await res.json()).error || `오류 ${res.status}`);
      setNoticeRows((prev) => prev.map((r) => (r.id === id ? { ...r, hidden: nextHidden } : r)));
    } catch (e) {
      window.alert(String(e instanceof Error ? e.message : e));
    } finally {
      setNtBusyKey(null);
    }
  }

  async function deleteNotice(id: string) {
    if (!window.confirm('이 공지글을 영구 삭제할까요? 되돌릴 수 없습니다.')) return;
    setNtBusyKey(id);
    try {
      const res = await api('/api/admin/delete', {
        method: 'POST',
        body: JSON.stringify({ target_type: 'post', target_id: id }),
      });
      if (res.status === 401) { logout(); return; }
      if (!res.ok) throw new Error((await res.json()).error || `오류 ${res.status}`);
      setNoticeRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      window.alert(String(e instanceof Error ? e.message : e));
    } finally {
      setNtBusyKey(null);
    }
  }

  function startEditNotice(row: any) {
    setNtEditingId(row.id);
    setNtEditTitle(row.title || '');
    setNtEditContent(row.content || '');
    setNtEditAuthor(row.author_name_override || '');
  }

  function cancelEditNotice() {
    setNtEditingId(null);
    setNtEditTitle('');
    setNtEditContent('');
    setNtEditAuthor('');
  }

  async function saveEditNotice() {
    if (!ntEditingId) return;
    if (!ntEditTitle.trim() || !ntEditContent.trim() || !ntEditAuthor.trim()) {
      window.alert('제목·본문·작성자명을 모두 입력해주세요.');
      return;
    }
    setNtEditSaving(true);
    try {
      const res = await api('/api/admin/notices', {
        method: 'PATCH',
        body: JSON.stringify({ id: ntEditingId, title: ntEditTitle, content: ntEditContent, author_name: ntEditAuthor }),
      });
      if (res.status === 401) { logout(); return; }
      if (!res.ok) throw new Error((await res.json()).error || `오류 ${res.status}`);
      setNoticeRows((prev) =>
        prev.map((r) =>
          r.id === ntEditingId ? { ...r, title: ntEditTitle, content: ntEditContent, author_name_override: ntEditAuthor } : r,
        ),
      );
      cancelEditNotice();
    } catch (e) {
      window.alert(String(e instanceof Error ? e.message : e));
    } finally {
      setNtEditSaving(false);
    }
  }

  // ── 정보·나눔 일반 게시글(공지 제외) ──
  const loadAllPosts = useCallback(async () => {
    setApLoading(true);
    setApErr('');
    try {
      const qs = apQuery.trim() ? `&q=${encodeURIComponent(apQuery.trim())}` : '';
      const res = await api(`/api/admin/posts?limit=200${qs}`);
      if (res.status === 401) { logout(); return; }
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `오류 ${res.status}`);
      setApRows(body.rows || []);
      setApLoaded(true);
    } catch (e) {
      setApErr(String(e instanceof Error ? e.message : e));
    } finally {
      setApLoading(false);
    }
  }, [apQuery, logout]);

  function startEditPost(row: any) {
    setApEditingId(row.id);
    setApEditTitle(row.title || '');
    setApEditContent(row.content || '');
  }

  function cancelEditPost() {
    setApEditingId(null);
    setApEditTitle('');
    setApEditContent('');
  }

  async function saveEditPost() {
    if (!apEditingId) return;
    if (!apEditTitle.trim() || !apEditContent.trim()) {
      window.alert('제목과 본문을 모두 입력해주세요.');
      return;
    }
    setApEditSaving(true);
    try {
      const res = await api('/api/admin/posts', {
        method: 'PATCH',
        body: JSON.stringify({ id: apEditingId, title: apEditTitle, content: apEditContent }),
      });
      if (res.status === 401) { logout(); return; }
      if (!res.ok) throw new Error((await res.json()).error || `오류 ${res.status}`);
      setApRows((prev) => prev.map((r) => (r.id === apEditingId ? { ...r, title: apEditTitle, content: apEditContent } : r)));
      cancelEditPost();
    } catch (e) {
      window.alert(String(e instanceof Error ? e.message : e));
    } finally {
      setApEditSaving(false);
    }
  }

  async function toggleAllPostHidden(id: string, nextHidden: boolean) {
    setApBusyKey(id);
    try {
      const res = await api('/api/admin/hide', {
        method: 'POST',
        body: JSON.stringify({
          target_type: 'post',
          target_id: id,
          hidden: nextHidden,
          reason: nextHidden ? '관리자 수동 숨김' : null,
        }),
      });
      if (res.status === 401) { logout(); return; }
      if (!res.ok) throw new Error((await res.json()).error || `오류 ${res.status}`);
      setApRows((prev) => prev.map((r) => (r.id === id ? { ...r, hidden: nextHidden } : r)));
    } catch (e) {
      window.alert(String(e instanceof Error ? e.message : e));
    } finally {
      setApBusyKey(null);
    }
  }

  async function deleteAllPost(id: string) {
    if (!window.confirm('이 게시글을 영구 삭제할까요? 되돌릴 수 없습니다.')) return;
    setApBusyKey(id);
    try {
      const res = await api('/api/admin/delete', {
        method: 'POST',
        body: JSON.stringify({ target_type: 'post', target_id: id }),
      });
      if (res.status === 401) { logout(); return; }
      if (!res.ok) throw new Error((await res.json()).error || `오류 ${res.status}`);
      setApRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      window.alert(String(e instanceof Error ? e.message : e));
    } finally {
      setApBusyKey(null);
    }
  }

  // ── 사용자 현황 ──
  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersErr('');
    try {
      const res = await api('/api/admin/user-activity');
      if (res.status === 401) { logout(); return; }
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `오류 ${res.status}`);
      setUserRows(body.rows || []);
      setUsersLoaded(true);
    } catch (e) {
      setUsersErr(String(e instanceof Error ? e.message : e));
    } finally {
      setUsersLoading(false);
    }
  }, [logout]);

  async function openTimeline(usr: any) {
    setSelectedUser(usr);
    setTimeline([]);
    setTimelineLoading(true);
    try {
      const res = await api(`/api/admin/user-activity?user_id=${usr.user_id}`);
      if (res.status === 401) { logout(); return; }
      const body = await res.json();
      if (res.ok) setTimeline(body.rows || []);
    } catch {
      /* noop */
    } finally {
      setTimelineLoading(false);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await api(`/api/admin/reports?only_visible=${onlyVisible ? 'true' : 'false'}&status=${status}&limit=200&offset=0`);
      if (res.status === 401) { logout(); return; }
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `오류 ${res.status}`);
      setRows(body.rows || []);
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }, [onlyVisible, status, logout]);

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    // 마이크로태스크로 미뤄 effect 동기 setState 경고 방지
    Promise.resolve().then(() => { if (!cancelled) load(); });
    return () => { cancelled = true; };
  }, [authed, load]);

  // 개발자 일기 탭 첫 진입 시 1회 로드.
  useEffect(() => {
    if (!authed || view !== 'devletter' || dlLoaded || dlLoading) return;
    let cancelled = false;
    Promise.resolve().then(() => { if (!cancelled) loadDevLetter(); });
    return () => { cancelled = true; };
  }, [authed, view, dlLoaded, dlLoading, loadDevLetter]);

  // 사용자 현황 탭 첫 진입 시 1회 로드.
  useEffect(() => {
    if (!authed || view !== 'users' || usersLoaded || usersLoading) return;
    let cancelled = false;
    Promise.resolve().then(() => { if (!cancelled) loadUsers(); });
    return () => { cancelled = true; };
  }, [authed, view, usersLoaded, usersLoading, loadUsers]);

  // 공지글 탭 첫 진입 시 1회 로드.
  useEffect(() => {
    if (!authed || view !== 'notices' || noticesLoaded || noticesLoading) return;
    let cancelled = false;
    Promise.resolve().then(() => { if (!cancelled) loadNotices(); });
    return () => { cancelled = true; };
  }, [authed, view, noticesLoaded, noticesLoading, loadNotices]);

  // 게시글 관리 탭 첫 진입 시 1회 로드.
  useEffect(() => {
    if (!authed || view !== 'allposts' || apLoaded || apLoading) return;
    let cancelled = false;
    Promise.resolve().then(() => { if (!cancelled) loadAllPosts(); });
    return () => { cancelled = true; };
  }, [authed, view, apLoaded, apLoading, loadAllPosts]);

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginBusy(true);
    setLoginErr('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error === 'invalid credentials' ? '아이디 또는 비밀번호가 올바르지 않습니다' : (body.error || `오류 ${res.status}`));
      localStorage.setItem(TOKEN_KEY, body.token);
      setUsername('');
      setPassword('');
      setAuthed(true);
    } catch (e2) {
      setLoginErr(String(e2 instanceof Error ? e2.message : e2));
    } finally {
      setLoginBusy(false);
    }
  }

  async function action(key: string, path: string, payload: Record<string, unknown>): Promise<boolean> {
    setBusyKey(key);
    setErr('');
    try {
      const res = await api(path, { method: 'POST', body: JSON.stringify(payload) });
      if (res.status === 401) { logout(); return false; }
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `오류 ${res.status}`);
      return true;
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
      return false;
    } finally {
      setBusyKey(null);
    }
  }

  async function toggleHidden(r: ReportRow) {
    const next = !r.hidden;
    let reason: string | null = null;
    if (next) {
      reason = window.prompt('숨김 사유 (선택)', '신고 누적');
      if (reason === null) return; // 취소
    } else {
      // 복구도 한 번 더 확인
      const label = r.target_type === 'post' ? '게시글' : '댓글';
      if (!window.confirm(`이 ${label}을(를) 다시 공개할까요?`)) return;
    }
    const ok = await action(`${r.target_id}:hide`, '/api/admin/hide', {
      target_type: r.target_type,
      target_id: r.target_id,
      hidden: next,
      reason,
    });
    if (ok) load();
  }

  async function deleteContent(r: ReportRow) {
    if (!window.confirm(`${targetLabel(r.target_type)}을(를) 영구 삭제합니다. 되돌릴 수 없습니다. 진행할까요?`)) return;
    const ok = await action(`${r.target_id}:del`, '/api/admin/delete', {
      target_type: r.target_type,
      target_id: r.target_id,
    });
    if (ok) load();
  }

  async function resolveReports(r: ReportRow, resolved: boolean) {
    if (resolved) {
      if (!window.confirm('이 신고를 종결 처리할까요?')) return;
    } else {
      if (!window.confirm('이 신고를 다시 진행중으로 되돌릴까요?')) return;
    }
    const ok = await action(`${r.target_id}:resolve`, '/api/admin/resolve', {
      target_type: r.target_type,
      target_id: r.target_id,
      resolved,
    });
    if (ok) load();
  }

  async function banAuthor(r: ReportRow) {
    if (!r.author_id) { setErr('작성자 정보가 없습니다'); return; }
    const reason = window.prompt(`작성자 "${r.author_name || r.author_id}" 의 이용을 정지합니다. 사유를 입력하세요.`, '신고 누적 / 커뮤니티 규정 위반');
    if (reason === null) return;
    const hide_content = window.confirm('이 작성자가 올린 글·댓글도 모두 숨김 처리할까요?\n\n확인 = 일괄 숨김 / 취소 = 공개 유지');
    const ok = await action(`${r.author_id}:ban`, '/api/admin/ban', {
      user_id: r.author_id,
      banned: true,
      reason,
      hide_content,
    });
    if (ok) {
      setErr('');
      window.alert(hide_content ? '이용 정지 + 기존 글·댓글 숨김 완료' : '이용 정지 완료 (기존 글은 공개 유지)');
      load();
    }
  }

  async function unbanAuthor(r: ReportRow) {
    if (!r.author_id) return;
    if (!window.confirm(`작성자 "${r.author_name || r.author_id}" 의 이용 정지를 해제할까요?`)) return;
    // 2차: 정지로 숨긴 글·댓글을 다시 공개할지 물어본다(신고누적 자동숨김 등 다른 사유 숨김은 복구되지 않음).
    const restore = window.confirm('이 작성자가 정지로 숨겨진 글·댓글도 다시 공개할까요?\n\n확인 = 정지로 숨긴 글 복구 / 취소 = 숨김 유지');
    const ok = await action(`${r.author_id}:unban`, '/api/admin/ban', {
      user_id: r.author_id,
      banned: false,
      reason: null,
      hide_content: restore,
    });
    if (ok) {
      window.alert(restore ? '이용 정지가 해제되고 숨긴 글도 다시 공개됐습니다.' : '이용 정지가 해제되었습니다.');
      load();
    }
  }

  // 행별 칩(뱃지) 렌더
  function targetChip(r: ReportRow) {
    return (
      <span className="adm-chip" style={{ background: '#f1f5f9', color: '#475569' }}>
        {targetLabel(r.target_type)}
      </span>
    );
  }
  function countChip(r: ReportRow) {
    const over = r.report_count >= AUTO_HIDE_THRESHOLD;
    return (
      <span className="adm-chip" style={{ background: over ? '#FFEBEE' : '#f1f5f9', color: over ? '#c62828' : '#475569' }}>
        신고 {r.report_count}
      </span>
    );
  }

  // 게시물 첨부 사진 썸네일 (테이블/카드 공용). 클릭 시 새 탭으로 원본 크게.
  // onError 시 해당 썸네일만 숨김(깨진 아이콘 방지).
  function MediaThumbs({ urls }: { urls?: string[] }) {
    const [broken, setBroken] = useState<Record<number, boolean>>({});
    if (!urls || urls.length === 0) return null;
    const visible = urls.filter((_, i) => !broken[i]);
    if (visible.length === 0) return null;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        {urls.map((url, i) =>
          broken[i] ? null : (
            <img
              key={i}
              src={url}
              alt="첨부 사진"
              onClick={() => window.open(url, '_blank', 'noopener')}
              onError={() => setBroken((b) => ({ ...b, [i]: true }))}
              style={{
                width: 52, height: 52, objectFit: 'cover',
                borderRadius: 8, border: '1px solid #e5e7eb',
                cursor: 'pointer', display: 'block', background: '#f6f8f6',
              }}
            />
          ),
        )}
      </div>
    );
  }

  // 행별 액션 버튼 묶음 (테이블/카드 공용)
  function ActionButtons({ r, busy }: { r: ReportRow; busy: boolean }) {
    return (
      <div className="adm-actions">
        {status === 'open' ? (
          <button className="adm-sm" disabled={busy} onClick={() => resolveReports(r, true)}>
            종결
          </button>
        ) : (
          <button className="adm-ghost adm-sm" disabled={busy} onClick={() => resolveReports(r, false)}>
            진행중 전환
          </button>
        )}
        <button className="adm-ghost adm-sm" disabled={busy} onClick={() => toggleHidden(r)}>
          {r.hidden ? '게시물 복원' : '게시물 숨김'}
        </button>
        <button className="adm-danger adm-sm" disabled={busy} onClick={() => deleteContent(r)}>
          게시물 영구삭제
        </button>
        {r.author_banned ? (
          <button className="adm-ghost adm-sm" disabled={busy || !r.author_id} onClick={() => unbanAuthor(r)}>
            정지 해제
          </button>
        ) : (
          <button className="adm-danger adm-sm" disabled={busy || !r.author_id} onClick={() => banAuthor(r)}>
            작성자 이용 정지
          </button>
        )}
      </div>
    );
  }

  const isBusy = (r: ReportRow) =>
    !!busyKey && (busyKey.startsWith(r.target_id) || busyKey.startsWith(r.author_id || '###'));

  // ── 로그인 화면 ──────────────────────────────────────────
  if (!authed) {
    return (
      <div className="adm">
        <style>{ADMIN_CSS}</style>
        <div className="adm-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <form
            onSubmit={doLogin}
            className="adm-card"
            style={{ width: '100%', maxWidth: 360, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <h1 className="adm-title" style={{ fontSize: 18 }}>관리자 로그인</h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>신고 검토·조치 관리 · 접속이 제한된 페이지입니다.</p>
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                className="adm-input"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="아이디"
                autoFocus
              />
              <input
                className="adm-input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
              />
              {loginErr && <div className="adm-err">{loginErr}</div>}
              <button type="submit" disabled={loginBusy || !username || !password} style={{ height: 42, marginTop: 2 }}>
                {loginBusy ? '확인 중…' : '로그인'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── 관리 화면 ────────────────────────────────────────────
  return (
    <div className="adm">
      <style>{ADMIN_CSS}</style>
      <div className="adm-page">
        <header className="adm-header">
          <div className="adm-header-inner">
            <h1 className="adm-title">파킨온 관리자</h1>
            <nav className="adm-nav">
              <button
                className={`adm-nav-btn${view === 'reports' ? ' is-active' : ''}`}
                onClick={() => setView('reports')}
              >
                신고 검토
              </button>
              <button
                className={`adm-nav-btn${view === 'users' ? ' is-active' : ''}`}
                onClick={() => setView('users')}
              >
                사용자 현황
              </button>
              <button
                className={`adm-nav-btn${view === 'devletter' ? ' is-active' : ''}`}
                onClick={() => setView('devletter')}
              >
                개발자 일기
              </button>
              <button
                className={`adm-nav-btn${view === 'notices' ? ' is-active' : ''}`}
                onClick={() => setView('notices')}
              >
                공지글 관리
              </button>
              <button
                className={`adm-nav-btn${view === 'allposts' ? ' is-active' : ''}`}
                onClick={() => setView('allposts')}
              >
                게시글 관리
              </button>
              <button className="adm-nav-btn" onClick={logout}>로그아웃</button>
            </nav>
          </div>
        </header>

        {view === 'devletter' ? (
          <main className="adm-main">
            <div className="adm-note">
              앱 첫 실행 시 뜨는 <b>개발자 일기</b> 본문을 편집합니다. <b>한국어</b>는 국내 사용자에게,
              <b> 영어</b>는 해외 사용자에게 각각 표시됩니다. <b>빈 줄</b>로 문단을 나눕니다(빈 줄 하나 = 문단 구분).
              저장하면 앱은 <b>다음 실행</b> 때 새 내용을 불러옵니다.
            </div>

            {dlErr && <div className="adm-err" style={{ marginTop: 12 }}>{dlErr}</div>}
            {dlSavedMsg && (
              <div style={{ marginTop: 12, fontSize: 13, color: '#2e7d32' }}>{dlSavedMsg}</div>
            )}

            {dlLoading && !dlLoaded ? (
              <div className="adm-empty">불러오는 중…</div>
            ) : (
              <>
                <div className="adm-dl-grid" style={{ marginTop: 16 }}>
                  <div className="adm-dl-card">
                    <div className="adm-dl-head">
                      <span className="adm-dl-lang">한국어 (국내 사용자)</span>
                      <span className="adm-dl-count">{countParagraphs(dlKo)}개 문단</span>
                    </div>
                    <textarea
                      className="adm-textarea"
                      value={dlKo}
                      onChange={(e) => { setDlKo(e.target.value); setDlSavedMsg(''); }}
                      placeholder="개발자 일기 (한국어). 빈 줄로 문단을 나눕니다."
                      spellCheck={false}
                    />
                  </div>
                  <div className="adm-dl-card">
                    <div className="adm-dl-head">
                      <span className="adm-dl-lang">English (해외 사용자)</span>
                      <span className="adm-dl-count">{countParagraphs(dlEn)}개 문단</span>
                    </div>
                    <textarea
                      className="adm-textarea"
                      value={dlEn}
                      onChange={(e) => { setDlEn(e.target.value); setDlSavedMsg(''); }}
                      placeholder="Developer's letter (English). Separate paragraphs with a blank line."
                      spellCheck={false}
                    />
                  </div>
                </div>

                {/* 마지막 서명 줄 — 앱에서 항상 서명 스타일(가운데·굵게)로 렌더됨 */}
                <div className="adm-dl-grid" style={{ marginTop: 16 }}>
                  <div className="adm-dl-card">
                    <div className="adm-dl-head">
                      <span className="adm-dl-lang">마지막 서명 줄 (한국어)</span>
                    </div>
                    <input
                      value={dlSigKo}
                      onChange={(e) => { setDlSigKo(e.target.value); setDlSavedMsg(''); }}
                      placeholder="예: 2026년 7월 15일 개발자 올림"
                      spellCheck={false}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: 14, border: '1px solid #d0d7d0', borderRadius: 8 }}
                    />
                  </div>
                  <div className="adm-dl-card">
                    <div className="adm-dl-head">
                      <span className="adm-dl-lang">Signature line (English)</span>
                    </div>
                    <input
                      value={dlSigEn}
                      onChange={(e) => { setDlSigEn(e.target.value); setDlSavedMsg(''); }}
                      placeholder="e.g. July 15, 2026 — From the developer"
                      spellCheck={false}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: 14, border: '1px solid #d0d7d0', borderRadius: 8 }}
                    />
                  </div>
                </div>
                <div className="adm-note" style={{ marginTop: 8 }}>
                  마지막 <b>서명 줄</b>은 앱에서 항상 <b>가운데 정렬·굵은 글씨(서명 스타일)</b>로 표시됩니다. "몇월 며칠 개발자 올림" 형식으로 쓰시면 됩니다.
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                  <button onClick={() => saveDevLetter(false)} disabled={dlSaving || !dlLoaded} style={{ height: 40, padding: '0 20px' }}>
                    {dlSaving ? '저장 중…' : '저장'}
                  </button>
                  <button
                    className="adm-warn"
                    onClick={() => saveDevLetter(true)}
                    disabled={dlSaving || !dlLoaded}
                    style={{ height: 40, padding: '0 20px' }}
                    title="예전에 '다시 보지 않기'를 누른 사용자에게도 팝업을 다시 띄웁니다."
                  >
                    저장 + 모두에게 다시 띄우기
                  </button>
                  <button className="adm-ghost" onClick={loadDevLetter} disabled={dlLoading || dlSaving} style={{ height: 40, padding: '0 16px' }}>
                    되돌리기(마지막 저장본 불러오기)
                  </button>
                </div>
                <div className="adm-note" style={{ marginTop: 12 }}>
                  <b>저장</b> = 문구만 바꿉니다(현재 팝업이 뜨는 사용자만 새 문구를 봅니다).<br />
                  <b>저장 + 모두에게 다시 띄우기</b> = 예전에 <b>'다시 보지 않기'</b>를 누른 사용자에게도 팝업을 한 번 더 띄웁니다.
                  그 사용자가 다시 '다시 보지 않기'를 누르면 이후로는 안 뜹니다.
                </div>
              </>
            )}
          </main>
        ) : view === 'notices' ? (
          <main className="adm-main">
            <div className="adm-note">
              정보·나눔 탭 게시판 <b>맨 위에 항상 고정</b>으로 노출되는 공지글을 관리합니다.
              작성자명은 실제 계정과 무관하게 <b>자유롭게 입력</b>할 수 있습니다.
            </div>

            <div className="adm-card" style={{ padding: 16, marginTop: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>새 공지 작성</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  className="adm-input"
                  placeholder="제목"
                  value={ntTitle}
                  onChange={(e) => setNtTitle(e.target.value)}
                />
                <input
                  className="adm-input"
                  placeholder="작성자명 (예: 파킨온 운영팀)"
                  value={ntAuthor}
                  onChange={(e) => setNtAuthor(e.target.value)}
                />
                <textarea
                  className="adm-input"
                  placeholder="본문"
                  value={ntContent}
                  onChange={(e) => setNtContent(e.target.value)}
                  rows={6}
                  style={{ height: 'auto', paddingTop: 10, paddingBottom: 10, resize: 'vertical' }}
                />
                <div>
                  <button onClick={createNotice} disabled={ntSaving} style={{ height: 40, padding: '0 20px' }}>
                    {ntSaving ? '게시 중…' : '공지 게시'}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
              <button className="adm-ghost" onClick={loadNotices} disabled={noticesLoading}>
                {noticesLoading ? '불러오는 중…' : '새로고침'}
              </button>
              <span style={{ color: '#6b7280', fontSize: 13 }}>{noticeRows.length}건</span>
            </div>

            {noticesErr && <div className="adm-err" style={{ marginBottom: 12 }}>{noticesErr}</div>}

            {noticesLoading && noticeRows.length === 0 ? (
              <div className="adm-empty">불러오는 중…</div>
            ) : noticeRows.length === 0 ? (
              <div className="adm-card"><div className="adm-empty">등록된 공지글이 없습니다.</div></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {noticeRows.map((n) => (
                  <div key={n.id} className="adm-card" style={{ padding: 14 }}>
                    {ntEditingId === n.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input
                          className="adm-input"
                          value={ntEditTitle}
                          onChange={(e) => setNtEditTitle(e.target.value)}
                          placeholder="제목"
                        />
                        <input
                          className="adm-input"
                          value={ntEditAuthor}
                          onChange={(e) => setNtEditAuthor(e.target.value)}
                          placeholder="작성자명"
                        />
                        <textarea
                          className="adm-input"
                          value={ntEditContent}
                          onChange={(e) => setNtEditContent(e.target.value)}
                          rows={6}
                          style={{ height: 'auto', paddingTop: 10, paddingBottom: 10, resize: 'vertical' }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={saveEditNotice} disabled={ntEditSaving}>
                            {ntEditSaving ? '저장 중…' : '저장'}
                          </button>
                          <button className="adm-ghost" onClick={cancelEditNotice} disabled={ntEditSaving}>
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{n.title}</span>
                          <span
                            className="adm-chip"
                            style={n.hidden ? { background: '#fdecec', color: '#c62828' } : { background: '#e8f5e9', color: '#2e7d32' }}
                          >
                            {n.hidden ? '숨김' : '노출중'}
                          </span>
                        </div>
                        <div className="adm-meta" style={{ marginTop: 4 }}>
                          {n.author_name_override || '-'}{' · '}{new Date(n.created_at).toLocaleString('ko-KR')}
                        </div>
                        <div className="adm-preview" style={{ marginTop: 8, maxWidth: 'none' }}>{n.content}</div>
                        <div className="adm-actions" style={{ marginTop: 10 }}>
                          <button className="adm-ghost" onClick={() => startEditNotice(n)}>
                            수정
                          </button>
                          <button
                            className="adm-ghost"
                            disabled={ntBusyKey === n.id}
                            onClick={() => toggleNoticeHidden(n.id, !n.hidden)}
                          >
                            {n.hidden ? '노출하기' : '숨기기'}
                          </button>
                          <button
                            className="adm-danger"
                            disabled={ntBusyKey === n.id}
                            onClick={() => deleteNotice(n.id)}
                          >
                            삭제
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </main>
        ) : view === 'allposts' ? (
          <main className="adm-main">
            <div className="adm-note">
              정보·나눔 탭 <b>일반 게시글 전체</b>를 열람·수정·삭제·숨김 처리합니다(공지글은 별도 탭).
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0', flexWrap: 'wrap' }}>
              <input
                className="adm-input"
                placeholder="제목 검색"
                value={apQuery}
                onChange={(e) => setApQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') loadAllPosts(); }}
                style={{ maxWidth: 260 }}
              />
              <button className="adm-ghost" onClick={loadAllPosts} disabled={apLoading}>
                {apLoading ? '불러오는 중…' : '검색/새로고침'}
              </button>
              <span style={{ color: '#6b7280', fontSize: 13 }}>{apRows.length}건</span>
            </div>

            {apErr && <div className="adm-err" style={{ marginBottom: 12 }}>{apErr}</div>}

            {apLoading && apRows.length === 0 ? (
              <div className="adm-empty">불러오는 중…</div>
            ) : apRows.length === 0 ? (
              <div className="adm-card"><div className="adm-empty">게시글이 없습니다.</div></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {apRows.map((p) => (
                  <div key={p.id} className="adm-card" style={{ padding: 14 }}>
                    {apEditingId === p.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input
                          className="adm-input"
                          value={apEditTitle}
                          onChange={(e) => setApEditTitle(e.target.value)}
                          placeholder="제목"
                        />
                        <textarea
                          className="adm-input"
                          value={apEditContent}
                          onChange={(e) => setApEditContent(e.target.value)}
                          rows={6}
                          style={{ height: 'auto', paddingTop: 10, paddingBottom: 10, resize: 'vertical' }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={saveEditPost} disabled={apEditSaving}>
                            {apEditSaving ? '저장 중…' : '저장'}
                          </button>
                          <button className="adm-ghost" onClick={cancelEditPost} disabled={apEditSaving}>
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{p.title}</span>
                          <span
                            className="adm-chip"
                            style={p.hidden ? { background: '#fdecec', color: '#c62828' } : { background: '#e8f5e9', color: '#2e7d32' }}
                          >
                            {p.hidden ? '숨김' : '노출중'}
                          </span>
                        </div>
                        <div className="adm-meta" style={{ marginTop: 4 }}>
                          {p.author?.name || '알 수 없음'}
                          {p.author?.role ? ` · ${roleLabel(p.author.role)}` : ''}
                          {' · '}{new Date(p.created_at).toLocaleString('ko-KR')}
                          {' · '}조회 {p.view_count ?? 0} · 댓글 {p.comment_count ?? 0}
                        </div>
                        <div className="adm-preview" style={{ marginTop: 8, maxWidth: 'none' }}>{p.content}</div>
                        <div className="adm-actions" style={{ marginTop: 10 }}>
                          <button className="adm-ghost" onClick={() => startEditPost(p)}>
                            수정
                          </button>
                          <button
                            className="adm-ghost"
                            disabled={apBusyKey === p.id}
                            onClick={() => toggleAllPostHidden(p.id, !p.hidden)}
                          >
                            {p.hidden ? '노출하기' : '숨기기'}
                          </button>
                          <button
                            className="adm-danger"
                            disabled={apBusyKey === p.id}
                            onClick={() => deleteAllPost(p.id)}
                          >
                            삭제
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </main>
        ) : view === 'users' ? (
          <main className="adm-main">
            {!selectedUser ? (
              <>
                <div className="adm-note">
                  앱 사용자를 <b>환자+보호자 세트</b>로 묶어 보여줍니다. 사용자를 누르면 그 사람의
                  <b> 모든 활동(화면 이동·약복용·기록 등)</b> 타임라인이 나옵니다. (기록은 이 기능 배포 이후부터 쌓입니다.)
                </div>
                {/* 알림 상태 요약 — 누르면 그 상태만 필터링 */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '14px 0 10px' }}>
                  {(['all', 'receiving', 'app_off', 'no_token'] as const).map((k) => {
                    const n = k === 'all' ? userRows.length : userRows.filter((u) => u.push_state === k).length;
                    const st = k === 'all' ? null : pushState(k);
                    const on = pushFilter === k;
                    return (
                      <button
                        key={k}
                        className="adm-ghost"
                        onClick={() => setPushFilter(k)}
                        style={{
                          borderColor: on ? (st?.color ?? '#4CAF50') : '#e5e7eb',
                          background: on ? (st?.bg ?? '#E8F5E9') : '#fff',
                          color: on ? (st?.color ?? '#2e7d32') : '#374151',
                          fontWeight: on ? 700 : 400,
                        }}
                      >
                        {k === 'all' ? '전체' : st!.label} {n}
                      </button>
                    );
                  })}
                </div>
                <div className="adm-note" style={{ fontSize: 12, lineHeight: 1.7 }}>
                  <b>알림 상태</b> — {' '}
                  {(['receiving', 'app_off', 'no_token'] as const).map((k, i) => (
                    <span key={k}>
                      {i > 0 && ' · '}
                      <b style={{ color: pushState(k).color }}>{pushState(k).label}</b> {pushState(k).desc}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0', flexWrap: 'wrap' }}>
                  <input
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="이름으로 검색"
                    style={{
                      flex: '1 1 200px', minWidth: 160, padding: '8px 12px', fontSize: 14,
                      border: '1px solid #e5e7eb', borderRadius: 8,
                    }}
                  />
                  <select
                    value={`${userSort.key}:${userSort.dir}`}
                    onChange={(e) => {
                      const [key, dir] = e.target.value.split(':');
                      setUserSort({ key, dir: dir as 'asc' | 'desc' });
                    }}
                    style={{ padding: '8px 10px', fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 8 }}
                  >
                    <option value="last_active:desc">최근 활동순</option>
                    <option value="created_at:desc">최신 가입순</option>
                    <option value="created_at:asc">오래된 가입순</option>
                    <option value="actions_total:desc">활동 많은순</option>
                    <option value="name:asc">이름순</option>
                    <option value="push_state:asc">알림 상태순</option>
                  </select>
                  <button className="adm-ghost" onClick={loadUsers} disabled={usersLoading}>
                    {usersLoading ? '불러오는 중…' : '새로고침'}
                  </button>
                  <span style={{ color: '#6b7280', fontSize: 13 }}>
                    {visibleUserRows.length}명
                    {visibleUserRows.length !== userRows.length && ` / 전체 ${userRows.length}명`}
                  </span>
                </div>
                {usersErr && <div className="adm-err" style={{ marginBottom: 12 }}>{usersErr}</div>}
                {usersLoading && userRows.length === 0 ? (
                  <div className="adm-empty">불러오는 중…</div>
                ) : visibleUserRows.length === 0 ? (
                  <div className="adm-card">
                    <div className="adm-empty">
                      {userRows.length === 0 ? '사용자가 없습니다.' : '조건에 맞는 사용자가 없습니다.'}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {groupSets(visibleUserRows).map((set, si) => (
                      <div key={set.group_id || `s${si}`} className="adm-card" style={{ padding: 12 }}>
                        {set.members.length > 1 && (
                          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>👨‍👩‍👧 연동 세트 ({set.members.length}명)</div>
                        )}
                        {set.members.map((m) => (
                          <div
                            key={m.user_id}
                            onClick={() => openTimeline(m)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                              padding: '10px 8px', borderTop: set.members.indexOf(m) > 0 ? '1px solid #f1f3f1' : 'none',
                              cursor: 'pointer',
                            }}
                          >
                            <span className="adm-chip" style={{ background: m.role === 'patient' ? '#E8F5E9' : '#f1f5f9', color: m.role === 'patient' ? '#2e7d32' : '#475569' }}>
                              {roleLabel(m.role)}
                            </span>
                            <b style={{ fontSize: 14, color: '#1a1a1a' }}>{m.name || '(이름 없음)'}</b>
                            {/* 알림 수신 상태 — 파킨온의 핵심 기능이라 이름 바로 옆에 둔다 */}
                            <span
                              className="adm-chip"
                              title={pushState(m.push_state).desc}
                              style={{ background: pushState(m.push_state).bg, color: pushState(m.push_state).color, fontWeight: 600 }}
                            >
                              {pushState(m.push_state).label}
                            </span>
                            {m.banned && (
                              <span className="adm-chip" style={{ background: '#FEE2E2', color: '#b91c1c', fontWeight: 600 }}>차단됨</span>
                            )}
                            <span className="adm-meta">
                              {m.is_kakao ? '카카오' : '구글/애플'}
                              {m.birth_year ? ` · ${m.birth_year}년생` : ''}
                              {m.language ? ` · ${m.language}` : ''}
                              {m.created_at ? ` · 가입 ${fmtTime(m.created_at)}` : ''}
                            </span>
                            <span className="adm-meta" style={{ marginLeft: 'auto' }}>
                              최근 활동 {m.last_active ? fmtTime(m.last_active) : '없음'}
                            </span>
                            <span className="adm-chip" style={{ background: '#f1f5f9', color: '#475569' }}>
                              오늘 {m.actions_1d} · 7일 {m.actions_7d} · 누적 {m.actions_total}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                  <button className="adm-ghost" onClick={() => setSelectedUser(null)}>← 목록</button>
                  <b style={{ fontSize: 16 }}>{selectedUser.name || '(이름 없음)'}</b>
                  <span className="adm-chip" style={{ background: '#f1f5f9', color: '#475569' }}>{roleLabel(selectedUser.role)}</span>
                  <button className="adm-ghost" onClick={() => openTimeline(selectedUser)} disabled={timelineLoading} style={{ marginLeft: 'auto' }}>
                    {timelineLoading ? '불러오는 중…' : '새로고침'}
                  </button>
                </div>
                {timelineLoading && timeline.length === 0 ? (
                  <div className="adm-empty">불러오는 중…</div>
                ) : timeline.length === 0 ? (
                  <div className="adm-card"><div className="adm-empty">아직 활동 기록이 없습니다.</div></div>
                ) : (
                  <div className="adm-card adm-scrollx">
                    <table className="adm-table">
                      <thead><tr><th>시각</th><th>액션</th><th>화면</th><th>상세</th></tr></thead>
                      <tbody>
                        {timeline.map((r) => (
                          <tr key={r.id}>
                            <td style={{ whiteSpace: 'nowrap' }}><span className="adm-meta">{fmtTime(r.created_at)}</span></td>
                            <td style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>{actionLabel(r.action)}</td>
                            <td style={{ whiteSpace: 'nowrap' }}><span className="adm-meta">{screenLabel(r.screen)}</span></td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              <span className="adm-meta">
                                {formatDetail(r.action, r.detail)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </main>
        ) : (
        <main className="adm-main">
          <div className="adm-note">
            신고 <b>{AUTO_HIDE_THRESHOLD}건</b> 이상 누적되면 콘텐츠는 <b>자동으로 숨김</b> 처리됩니다.
            아래 목록에서 수동으로 게시물 숨김/복원, 게시물 영구삭제, 작성자 이용 정지/해제를 할 수 있습니다.
          </div>

          <div className="adm-tabs" style={{ marginTop: 16 }}>
            <button
              className={`adm-tab${status === 'open' ? ' is-active' : ''}`}
              onClick={() => { if (status !== 'open') setStatus('open'); }}
            >
              진행중
            </button>
            <button
              className={`adm-tab${status === 'resolved' ? ' is-active' : ''}`}
              onClick={() => { if (status !== 'resolved') setStatus('resolved'); }}
            >
              종결
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '16px 0', flexWrap: 'wrap' }}>
            <label className="adm-check">
              <input type="checkbox" checked={onlyVisible} onChange={(e) => setOnlyVisible(e.target.checked)} />
              숨김 안 된 것만 보기
            </label>
            <button className="adm-ghost" onClick={load} disabled={loading}>
              {loading ? '불러오는 중…' : '새로고침'}
            </button>
            <span style={{ color: '#6b7280', fontSize: 13, marginLeft: 'auto' }}>{rows.length}건</span>
          </div>

          {err && <div className="adm-err" style={{ marginBottom: 12 }}>{err}</div>}

          {loading && rows.length === 0 ? (
            <div className="adm-empty">불러오는 중…</div>
          ) : rows.length === 0 ? (
            <div className="adm-card"><div className="adm-empty">{status === 'open' ? '진행중인 신고가 없습니다.' : '종결된 신고가 없습니다.'}</div></div>
          ) : (
            <>
              {/* 데스크탑: 테이블 */}
              <div className="adm-tablewrap adm-card" style={{ overflowX: 'auto' }}>
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>대상</th>
                      <th>내용</th>
                      <th>작성자</th>
                      <th>사유</th>
                      <th>최근 신고</th>
                      <th>상태</th>
                      <th>조치</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const busy = isBusy(r);
                      return (
                        <tr key={`${r.target_type}:${r.target_id}`} className={r.hidden ? 'is-hidden' : ''}>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                              {targetChip(r)}
                              {countChip(r)}
                            </div>
                          </td>
                          <td>
                            <div className="adm-preview">
                              {r.content_preview || <span style={{ color: '#9ca3af' }}>(내용 미리보기 없음)</span>}
                            </div>
                            <MediaThumbs urls={r.media_urls} />
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                              <span style={{ fontSize: 13, fontWeight: 400, color: '#374151' }}>{r.author_name || '(이름 없음)'}</span>
                              {r.author_banned && (
                                <span className="adm-chip" style={{ background: '#FFEBEE', color: '#c62828' }}>이용 정지됨</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="adm-meta">{r.reasons && r.reasons.length > 0 ? r.reasons.join(', ') : '-'}</span>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <span className="adm-meta">{fmtTime(r.last_reported_at)}</span>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {r.resolved && (
                                <span className="adm-chip" style={{ background: '#e8eaed', color: '#5f6368' }}>종결됨</span>
                              )}
                              {r.hidden ? (
                                <>
                                  <span className="adm-chip" style={{ background: '#37474f', color: '#fff' }}>게시물 숨김</span>
                                  {r.hidden_reason && (
                                    <span className="adm-meta">{r.hidden_reason} · {fmtTime(r.hidden_at)}</span>
                                  )}
                                </>
                              ) : (
                                !r.resolved && <span className="adm-meta">노출</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <ActionButtons r={r} busy={busy} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 모바일: 카드 */}
              <div className="adm-cards">
                {rows.map((r) => {
                  const busy = isBusy(r);
                  return (
                    <div key={`m:${r.target_type}:${r.target_id}`} className={`adm-rowcard${r.hidden ? ' is-hidden' : ''}`}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                        {targetChip(r)}
                        {countChip(r)}
                        {r.resolved && <span className="adm-chip" style={{ background: '#e8eaed', color: '#5f6368' }}>종결됨</span>}
                        {r.hidden && <span className="adm-chip" style={{ background: '#37474f', color: '#fff' }}>게시물 숨김</span>}
                        <span className="adm-meta" style={{ marginLeft: 'auto' }}>{fmtTime(r.last_reported_at)}</span>
                      </div>
                      <div
                        className="adm-preview"
                        style={{ maxWidth: '100%', background: '#fafafa', border: '1px solid #eee', borderRadius: 10, padding: '10px 12px' }}
                      >
                        {r.content_preview || <span style={{ color: '#9ca3af' }}>(내용 미리보기 없음)</span>}
                      </div>
                      <MediaThumbs urls={r.media_urls} />
                      <div className="adm-meta" style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          작성자: <b style={{ color: '#374151' }}>{r.author_name || '(이름 없음)'}</b>
                          {r.author_banned && (
                            <span className="adm-chip" style={{ background: '#FFEBEE', color: '#c62828' }}>이용 정지됨</span>
                          )}
                        </span>
                        {r.reasons && r.reasons.length > 0 && <span>사유: {r.reasons.join(', ')}</span>}
                      </div>
                      {r.hidden && r.hidden_reason && (
                        <div className="adm-meta" style={{ marginTop: 4 }}>
                          숨김 사유: {r.hidden_reason} ({fmtTime(r.hidden_at)})
                        </div>
                      )}
                      <div style={{ marginTop: 12 }}>
                        <ActionButtons r={r} busy={busy} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </main>
        )}
      </div>
    </div>
  );
}
