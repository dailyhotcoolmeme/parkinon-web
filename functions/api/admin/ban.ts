import { guard, callRpc, json, type Ctx } from '../../_lib/adminAuth';

// 작성자 밴/언밴: admin_set_user_banned(p_user_id, p_banned, p_reason, p_hide_content)
export const onRequestPost = async ({ request, env }: Ctx): Promise<Response> => {
  const blocked = await guard(env, request);
  if (blocked) return blocked;

  let body: { user_id?: string; banned?: boolean; reason?: string; hide_content?: boolean };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'bad request' });
  }
  if (!body.user_id || typeof body.banned !== 'boolean') {
    return json(400, { error: 'missing fields' });
  }

  try {
    const data = await callRpc(env, 'admin_set_user_banned', {
      p_user_id: body.user_id,
      p_banned: body.banned,
      p_reason: body.reason ?? null,
      p_hide_content: body.hide_content === true,
    });
    return json(200, { ok: true, data });
  } catch (e) {
    return json(500, { error: String(e) });
  }
};
