import { guard, callRpc, json, type Ctx } from '../../_lib/adminAuth';

// 콘텐츠 숨김/복구: admin_set_content_hidden(p_target_type, p_target_id, p_hidden, p_reason)
export const onRequestPost = async ({ request, env }: Ctx): Promise<Response> => {
  const blocked = await guard(env, request);
  if (blocked) return blocked;

  let body: { target_type?: string; target_id?: string; hidden?: boolean; reason?: string };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'bad request' });
  }
  if (!body.target_type || !body.target_id || typeof body.hidden !== 'boolean') {
    return json(400, { error: 'missing fields' });
  }

  try {
    const data = await callRpc(env, 'admin_set_content_hidden', {
      p_target_type: body.target_type,
      p_target_id: body.target_id,
      p_hidden: body.hidden,
      p_reason: body.reason ?? null,
    });
    return json(200, { ok: true, data });
  } catch (e) {
    return json(500, { error: String(e) });
  }
};
