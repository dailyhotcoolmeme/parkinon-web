import { guard, callRpc, json, type Ctx } from '../../_lib/adminAuth';

// 콘텐츠 영구 삭제: admin_delete_content(p_target_type, p_target_id)
export const onRequestPost = async ({ request, env }: Ctx): Promise<Response> => {
  const blocked = await guard(env, request);
  if (blocked) return blocked;

  let body: { target_type?: string; target_id?: string };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'bad request' });
  }
  if (!body.target_type || !body.target_id) {
    return json(400, { error: 'missing fields' });
  }

  try {
    const data = await callRpc(env, 'admin_delete_content', {
      p_target_type: body.target_type,
      p_target_id: body.target_id,
    });
    return json(200, { ok: true, data });
  } catch (e) {
    return json(500, { error: String(e) });
  }
};
