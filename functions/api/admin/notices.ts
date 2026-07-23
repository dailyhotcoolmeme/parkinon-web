import { guard, json, type Ctx, type AdminEnv } from '../../_lib/adminAuth';

// 정보·나눔 탭 공지글 관리. 단순 테이블 조작이라 RPC 대신 service_role 직접 REST(dev-letter.ts 패턴).
// author_id 는 posts FK(NOT NULL)를 충족시키기 위한 예약 시스템 유저 고정값 —
// 실제 표시 작성자명은 author_name_override(자유 텍스트, 실제 계정과 무관)를 우선 사용한다.
const NOTICE_AUTHOR_ID = '00000000-0000-0000-0000-000000000001';

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

async function restPost(env: AdminEnv, path: string, body: unknown): Promise<any> {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`POST ${path} ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

// GET: 공지 목록 (숨김 포함, 관리 목적)
export const onRequestGet = async ({ request, env }: Ctx): Promise<Response> => {
  const blocked = await guard(env, request);
  if (blocked) return blocked;

  try {
    const rows = await restGet(
      env,
      'posts?is_notice=eq.true&select=id,title,content,author_name_override,hidden,hidden_reason,created_at&order=created_at.desc&limit=200',
    );
    return json(200, { rows: rows ?? [] });
  } catch (e) {
    return json(500, { error: String(e) });
  }
};

// POST: 공지 생성. body: { title, content, author_name }
export const onRequestPost = async ({ request, env }: Ctx): Promise<Response> => {
  const blocked = await guard(env, request);
  if (blocked) return blocked;

  let body: { title?: string; content?: string; author_name?: string };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'bad request' });
  }
  const title = (body.title || '').trim();
  const content = (body.content || '').trim();
  const authorName = (body.author_name || '').trim();
  if (!title || !content || !authorName) {
    return json(400, { error: 'title, content, author_name 필드가 필요합니다.' });
  }

  try {
    const inserted = await restPost(env, 'posts', {
      author_id: NOTICE_AUTHOR_ID,
      post_type: 'info',
      title,
      content,
      is_notice: true,
      author_name_override: authorName,
      hidden: false,
    });
    return json(200, { ok: true, data: Array.isArray(inserted) ? inserted[0] : inserted });
  } catch (e) {
    return json(500, { error: String(e) });
  }
};
