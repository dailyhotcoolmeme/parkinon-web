import { guard, callRpc, json, type Ctx } from '../../_lib/adminAuth';

// 앱 사용자 현황 / 활동 로그.
//  - GET (user_id 없음): 사용자 목록 + 활동 요약 (프론트가 group_id 로 환자+보호자 세트 묶음).
//  - GET ?user_id=<uuid>: 그 사용자의 활동 타임라인.
export const onRequestGet = async ({ request, env }: Ctx): Promise<Response> => {
  const blocked = await guard(env, request);
  if (blocked) return blocked;

  const u = new URL(request.url);
  const userId = u.searchParams.get('user_id');

  try {
    if (userId) {
      const limit = Math.min(Math.max(parseInt(u.searchParams.get('limit') || '300', 10) || 300, 1), 1000);
      const offset = Math.max(parseInt(u.searchParams.get('offset') || '0', 10) || 0, 0);
      const rows = await callRpc(env, 'admin_user_activity', {
        p_user_id: userId,
        p_limit: limit,
        p_offset: offset,
      });
      return json(200, { rows: Array.isArray(rows) ? rows : [] });
    }
    const rows = await callRpc(env, 'admin_user_list', {});
    return json(200, { rows: Array.isArray(rows) ? rows : [] });
  } catch (e) {
    return json(500, { error: String(e) });
  }
};
