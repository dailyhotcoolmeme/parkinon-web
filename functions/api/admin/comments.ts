import { guard, json, type Ctx, type AdminEnv } from '../../_lib/adminAuth';

// 운영자 댓글 — 관리자 화면에서 사용자 게시글/공지에 댓글·대댓글을 단다.
//
// 왜 별도 경로인가:
//   운영자는 자기 실제 계정(가족용 실명)으로 댓글을 달 수 없다. posts 의 공지글과 똑같이
//   예약 시스템 유저를 author_id 로 쓰고, 화면에 보이는 이름은 author_name_override 로 덮는다.
//   앱은 author_name_override 가 있으면 그 이름을 먼저 쓴다(PostDetailScreen.commentAuthorName).
//
// 숨김/삭제는 기존 admin_set_content_hidden / admin_delete_content RPC(hide.ts/delete.ts)를 그대로 쓴다.
const OPERATOR_AUTHOR_ID = '00000000-0000-0000-0000-000000000001';

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

// GET: 특정 게시글의 댓글 목록. ?post_id=...
export const onRequestGet = async ({ request, env }: Ctx): Promise<Response> => {
  const blocked = await guard(env, request);
  if (blocked) return blocked;

  const postId = (new URL(request.url).searchParams.get('post_id') || '').trim();
  if (!postId) return json(400, { error: 'post_id 가 필요합니다.' });

  try {
    const rows = await restGet(
      env,
      `comments?post_id=eq.${postId}&select=id,content,parent_id,hidden,hidden_reason,created_at,author_id,author_name_override,author:users(name,role)&order=created_at.asc`,
    );
    return json(200, { rows: rows ?? [] });
  } catch (e) {
    return json(500, { error: String(e) });
  }
};

// POST: 운영자 댓글 작성. body: { post_id, content, author_name, parent_id? }
export const onRequestPost = async ({ request, env }: Ctx): Promise<Response> => {
  const blocked = await guard(env, request);
  if (blocked) return blocked;

  let body: { post_id?: string; content?: string; author_name?: string; parent_id?: string | null };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'bad request' });
  }
  const postId = (body.post_id || '').trim();
  const content = (body.content || '').trim();
  const authorName = (body.author_name || '').trim();
  if (!postId || !content || !authorName) {
    return json(400, { error: 'post_id, content, author_name 필드가 필요합니다.' });
  }

  try {
    const inserted = await restPost(env, 'comments', {
      post_id: postId,
      author_id: OPERATOR_AUTHOR_ID,
      parent_id: body.parent_id || null,
      content,
      author_name_override: authorName,
      hidden: false,
    });
    return json(200, { ok: true, data: Array.isArray(inserted) ? inserted[0] : inserted });
  } catch (e) {
    return json(500, { error: String(e) });
  }
};

// PATCH: 댓글 내용 수정. body: { id, content }
// 사용자 댓글도 고칠 수 있지만, 남의 말을 바꾸는 일이라 운영자 댓글에만 쓰는 것을 전제로 한다
// (화면에서도 운영자 댓글에만 수정 버튼을 노출한다).
export const onRequestPatch = async ({ request, env }: Ctx): Promise<Response> => {
  const blocked = await guard(env, request);
  if (blocked) return blocked;

  let body: { id?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'bad request' });
  }
  const content = (body.content || '').trim();
  if (!body.id || !content) {
    return json(400, { error: 'id, content 필드가 필요합니다.' });
  }

  try {
    const updated = await restPatch(env, `comments?id=eq.${body.id}`, { content });
    return json(200, { ok: true, data: Array.isArray(updated) ? updated[0] : updated });
  } catch (e) {
    return json(500, { error: String(e) });
  }
};
