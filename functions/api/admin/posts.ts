import { guard, json, type Ctx, type AdminEnv } from '../../_lib/adminAuth';

// 정보·나눔 탭 일반 게시글(공지 제외) 관리 — 목록 조회 + 제목/본문 수정.
// 숨김/삭제는 기존 admin_set_content_hidden/admin_delete_content RPC(hide.ts/delete.ts) 재사용.
// service_role 은 RLS 를 우회하므로 users 를 직접 조인해 실제 작성자명을 가져온다(공개 뷰 불필요).

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

// GET: 게시글 목록 (공지 제외, 검색어 지원). ?q=검색어&limit=&offset=
export const onRequestGet = async ({ request, env }: Ctx): Promise<Response> => {
  const blocked = await guard(env, request);
  if (blocked) return blocked;

  const u = new URL(request.url);
  const q = (u.searchParams.get('q') || '').trim();
  const limit = Math.min(Math.max(parseInt(u.searchParams.get('limit') || '100', 10) || 100, 1), 500);
  const offset = Math.max(parseInt(u.searchParams.get('offset') || '0', 10) || 0, 0);

  try {
    const searchParam = q ? `&title=ilike.*${encodeURIComponent(q)}*` : '';
    const rows = await restGet(
      env,
      `posts?is_notice=eq.false&select=id,title,content,post_type,hidden,hidden_reason,view_count,comment_count,created_at,author:users(name,role)&order=created_at.desc&limit=${limit}&offset=${offset}${searchParam}`,
    );
    return json(200, { rows: rows ?? [] });
  } catch (e) {
    return json(500, { error: String(e) });
  }
};

// PATCH: 게시글 제목/본문 수정. body: { id, title, content }
export const onRequestPatch = async ({ request, env }: Ctx): Promise<Response> => {
  const blocked = await guard(env, request);
  if (blocked) return blocked;

  let body: { id?: string; title?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'bad request' });
  }
  const title = (body.title || '').trim();
  const content = (body.content || '').trim();
  if (!body.id || !title || !content) {
    return json(400, { error: 'id, title, content 필드가 필요합니다.' });
  }

  try {
    const updated = await restPatch(env, `posts?id=eq.${body.id}`, {
      title,
      content,
      updated_at: new Date().toISOString(),
    });
    return json(200, { ok: true, data: Array.isArray(updated) ? updated[0] : updated });
  } catch (e) {
    return json(500, { error: String(e) });
  }
};
