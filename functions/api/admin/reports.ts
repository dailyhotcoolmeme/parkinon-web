import { guard, callRpc, json, type Ctx } from '../../_lib/adminAuth';
import { signMediaUrl } from '../../_lib/r2proxy';

// 신고 목록 조회: admin_list_reports(p_only_visible, p_limit, p_offset)
export const onRequestGet = async ({ request, env }: Ctx): Promise<Response> => {
  const blocked = await guard(env, request);
  if (blocked) return blocked;

  const u = new URL(request.url);
  const onlyVisible = u.searchParams.get('only_visible') === 'true';
  const limit = Math.min(Math.max(parseInt(u.searchParams.get('limit') || '100', 10) || 100, 1), 500);
  const offset = Math.max(parseInt(u.searchParams.get('offset') || '0', 10) || 0, 0);
  // 진행중/종결 필터: open(진행중) | resolved(종결) | all. 기본 open.
  const statusParam = u.searchParams.get('status') || 'open';
  const status = ['open', 'resolved', 'all'].includes(statusParam) ? statusParam : 'open';

  try {
    const data = await callRpc(env, 'admin_list_reports', {
      p_only_visible: onlyVisible,
      p_limit: limit,
      p_offset: offset,
      p_status: status,
    });

    // 게시물 첨부 사진(media_keys) → 워커 프록시 토큰 URL(media_urls) 로 변환.
    // R2_PROXY_SECRET 미설정 시 빈 배열(graceful — 에러 없이 썸네일만 비표시).
    const rows = Array.isArray(data) ? data : [];
    const withMedia = await Promise.all(
      rows.map(async (row: any) => {
        const keys: string[] = Array.isArray(row?.media_keys) ? row.media_keys : [];
        const media_urls = (
          await Promise.all(keys.map((k) => signMediaUrl(env, k)))
        ).filter((u) => !!u);
        return { ...row, media_urls };
      }),
    );

    return json(200, { rows: withMedia });
  } catch (e) {
    return json(500, { error: String(e) });
  }
};
