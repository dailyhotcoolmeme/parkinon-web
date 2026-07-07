import { guard, callRpc, json, type Ctx } from '../../_lib/adminAuth';

// 신고 그룹 종결/다시 열기: admin_set_reports_resolved(p_target_type, p_target_id, p_resolved)
export const onRequestPost = async ({ request, env }: Ctx): Promise<Response> => {
  const blocked = await guard(env, request);
  if (blocked) return blocked;

  let body: { target_type?: string; target_id?: string; resolved?: boolean };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'bad request' });
  }
  if (!body.target_type || !body.target_id || typeof body.resolved !== 'boolean') {
    return json(400, { error: 'missing fields' });
  }

  try {
    const data = await callRpc(env, 'admin_set_reports_resolved', {
      p_target_type: body.target_type,
      p_target_id: body.target_id,
      p_resolved: body.resolved,
    });
    return json(200, { ok: true, data });
  } catch (e) {
    return json(500, { error: String(e) });
  }
};
