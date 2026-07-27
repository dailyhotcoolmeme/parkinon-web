import { guard, json, type Ctx, type AdminEnv } from '../../_lib/adminAuth';

// 개발자 일기(dev_letter) 본문 조회/저장.
// - 단일 행(id=1). body_ko / body_en 는 "빈 줄(문단 사이)" 기준으로 앱에서 문단이 나뉜다.
// - 공개 읽기 RLS가 있어 앱(anon)은 직접 SELECT 하지만, admin은 service_role 로 조회/수정한다.

// service_role 직접 REST 호출 (RLS 우회). RPC가 아니라 단순 테이블이라 PostgREST 테이블 API 사용.
async function restGet(env: AdminEnv, path: string): Promise<any> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      Accept: 'application/json',
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GET ${path} ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function restPatch(env: AdminEnv, path: string, body: unknown): Promise<any> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`PATCH ${path} ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

// GET: 현재 본문(한/영) 반환. { body_ko, body_en, updated_at, popup_version }
export const onRequestGet = async ({ request, env }: Ctx): Promise<Response> => {
  const blocked = await guard(env, request);
  if (blocked) return blocked;
  try {
    const rows = await restGet(env, 'dev_letter?id=eq.1&select=body_ko,body_en,signature_ko,signature_en,updated_at,popup_version');
    const row = Array.isArray(rows) && rows[0]
      ? rows[0]
      : { body_ko: '', body_en: '', signature_ko: '', signature_en: '', updated_at: null, popup_version: 1 };
    return json(200, row);
  } catch (e) {
    return json(500, { error: String(e) });
  }
};

// POST: 본문 저장. body: { body_ko, body_en, force? }
//  - force=true 이면 popup_version 을 +1 → 이미 '다시 보지 않기' 한 사용자에게도 다음 실행 때 1회 재노출.
//  - force 없으면 문구만 저장(팝업이 뜨는 사용자만 새 문구를 보게 됨).
export const onRequestPost = async ({ request, env }: Ctx): Promise<Response> => {
  const blocked = await guard(env, request);
  if (blocked) return blocked;
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: 'invalid json' });
  }
  const body_ko = typeof payload?.body_ko === 'string' ? payload.body_ko : null;
  const body_en = typeof payload?.body_en === 'string' ? payload.body_en : null;
  // 서명(마지막 줄)은 선택 — 넘어오면 저장, 없으면 기존 값 유지.
  const signature_ko = typeof payload?.signature_ko === 'string' ? payload.signature_ko : null;
  const signature_en = typeof payload?.signature_en === 'string' ? payload.signature_en : null;
  const force = payload?.force === true;
  if (body_ko === null || body_en === null) {
    return json(400, { error: 'body_ko and body_en are required strings' });
  }
  try {
    const patch: Record<string, unknown> = {
      body_ko,
      body_en,
      updated_at: new Date().toISOString(),
    };
    if (signature_ko !== null) patch.signature_ko = signature_ko;
    if (signature_en !== null) patch.signature_en = signature_en;
    if (force) {
      // PostgREST 는 col = col + 1 식을 지원하지 않으므로 현재 값을 읽어 +1.
      const rows = await restGet(env, 'dev_letter?id=eq.1&select=popup_version');
      const cur = Array.isArray(rows) && rows[0] && typeof rows[0].popup_version === 'number'
        ? rows[0].popup_version
        : 1;
      patch.popup_version = cur + 1;
    }
    const updated = await restPatch(env, 'dev_letter?id=eq.1', patch);
    const row = Array.isArray(updated) && updated[0] ? updated[0] : null;
    return json(200, {
      ok: true,
      forced: force,
      updated_at: row?.updated_at ?? null,
      popup_version: row?.popup_version ?? null,
    });
  } catch (e) {
    return json(500, { error: String(e) });
  }
};
