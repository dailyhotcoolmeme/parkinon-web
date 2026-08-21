/*
 * 톱바 검색(Header.astro)의 임상시험·연구 부분 — trials.js/research.js 와 같은 방식으로
 * search_trials/search_research RPC를 그대로 재사용한다(오너 지시 2026-08-16: "글 +
 * 임상시험·연구까지 전부"). 이 화면엔 상세페이지가 없으므로 개별 항목이 아니라 /clinical/
 * 페이지의 실시간 검색으로 넘겨주는 용도라, 결과는 미리보기 몇 건 + 전체 건수만 준다.
 */
import { createClient } from '@supabase/supabase-js';

export async function onRequestGet(context) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = context.env;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const url = new URL(context.request.url);
  const p = url.searchParams;
  const q = (p.get('q') ?? '').trim();
  const locale = p.get('locale') || 'ko';

  if (!q) {
    return new Response(JSON.stringify({ trials: [], trialsTotal: 0, research: [], researchTotal: 0 }), {
      headers: { 'content-type': 'application/json' },
    });
  }

  const [trialsRes, researchRes] = await Promise.all([
    supabase.rpc('search_trials', { p_locale: locale, p_q: q, p_status: 'ALL', p_limit: 5, p_offset: 0 }),
    supabase.rpc('search_research', { p_locale: locale, p_q: q, p_limit: 5, p_offset: 0 }),
  ]);

  const trials = (trialsRes.data ?? []).map((row) => ({ id: row.nct_id, title: row.title_translated ?? row.title_en }));
  const research = (researchRes.data ?? []).map((row) => ({ id: row.pmid, title: row.title_translated ?? row.title_en }));

  return new Response(
    JSON.stringify({
      trials,
      trialsTotal: trialsRes.data?.[0]?.total_count ?? 0,
      research,
      researchTotal: researchRes.data?.[0]?.total_count ?? 0,
    }),
    { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } },
  );
}
