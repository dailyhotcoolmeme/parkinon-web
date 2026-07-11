import { useCallback, useEffect, useState } from 'react';

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
type AdminView = 'reports' | 'devletter';

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
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
}
.adm-title { font-size: 16px; font-weight: 700; margin: 0; color: #1a1a1a; }
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

/* 데스크탑 테이블 — myamen-pastor 기준: 본문 14px(text-sm), 헤더 12px(text-xs)/weight 500/패딩 12px 8px */
.adm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
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

/* 상단 뷰 전환 내비 (신고 검토 / 개발자 일기) */
.adm-nav { display: flex; gap: 4px; }
.adm button.adm-nav-btn {
  font-family: inherit; font-size: 14px; font-weight: 600; line-height: 1.2;
  background: none; border: 1px solid transparent; color: #6b7280; cursor: pointer;
  padding: 6px 12px; border-radius: 8px; height: auto; min-height: 0;
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
  const [dlLoaded, setDlLoaded] = useState(false);
  const [dlLoading, setDlLoading] = useState(false);
  const [dlSaving, setDlSaving] = useState(false);
  const [dlErr, setDlErr] = useState('');
  const [dlSavedMsg, setDlSavedMsg] = useState('');

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthed(false);
    setRows([]);
    setDlLoaded(false);
    setDlKo('');
    setDlEn('');
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
        body: JSON.stringify({ body_ko: dlKo, body_en: dlEn, force }),
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
            <h1 className="adm-title" style={{ fontSize: 18 }}>운영자 로그인</h1>
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
            <h1 className="adm-title">파킨온 운영자</h1>
            <nav className="adm-nav">
              <button
                className={`adm-nav-btn${view === 'reports' ? ' is-active' : ''}`}
                onClick={() => setView('reports')}
              >
                신고 검토
              </button>
              <button
                className={`adm-nav-btn${view === 'devletter' ? ' is-active' : ''}`}
                onClick={() => setView('devletter')}
              >
                개발자 일기
              </button>
            </nav>
            <button className="adm-ghost" onClick={logout}>로그아웃</button>
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
