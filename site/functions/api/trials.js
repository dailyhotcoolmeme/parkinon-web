/*
 * 임상시험 검색+필터+더보기 — Cloudflare Pages Function. 화면에 이미 구운(빌드 타임) 30건과
 * 별개로, 방문 중에 Supabase RPC `search_trials`를 실시간으로 부른다(오너 확정 2026-08-08:
 * "검색은 화면에 보여지는거랑 별개로 db에서 검색되는거 맞지?").
 *
 * anon 키만 쓴다 — RPC는 SELECT 전용이고 테이블 RLS가 이미 공개 읽기를 허용한다.
 */
import { createClient } from '@supabase/supabase-js';

const COUNTRY_API_NAME = {
  kr: 'South Korea',
  us: 'United States',
  jp: 'Japan',
  fr: 'France',
  de: 'Germany',
  it: 'Italy',
  au: 'Australia',
};

export async function onRequestGet(context) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = context.env;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const url = new URL(context.request.url);
  const p = url.searchParams;

  const country = p.get('country');
  const { data, error } = await supabase.rpc('search_trials', {
    p_locale: p.get('locale') || 'ko',
    p_q: p.get('q') || null,
    p_country: country && country !== 'all' ? COUNTRY_API_NAME[country] ?? null : null,
    p_phase: p.get('phase') || null,
    p_date_from: p.get('date_from') || null,
    p_date_to: p.get('date_to') || null,
    p_sponsor: p.get('sponsor') || null,
    p_limit: Math.min(Number(p.get('limit')) || 30, 100),
    p_offset: Number(p.get('offset')) || 0,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'content-type': 'application/json' } });
  }

  const total = data?.[0]?.total_count ?? 0;
  const items = (data ?? []).map((row) => ({
    nctId: row.nct_id,
    title: row.title_en,
    titleTranslated: row.title_translated,
    phaseKey: row.phase_key,
    sponsor: row.sponsor,
    startDate: row.start_date,
    startDateEstimated: row.start_date_estimated,
    completionDate: row.completion_date,
    completionDateEstimated: row.completion_date_estimated,
    lastUpdate: row.last_update,
    url: row.url,
  }));

  return new Response(JSON.stringify({ items, total }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
