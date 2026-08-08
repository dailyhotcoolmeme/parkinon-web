/*
 * 연구 검색+필터+더보기 — trials.js 와 같은 방식. Supabase RPC `search_research`를
 * 방문 중에 실시간으로 부른다. anon 키만 쓴다(RLS가 공개 읽기 허용).
 */
import { createClient } from '@supabase/supabase-js';

export async function onRequestGet(context) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = context.env;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const url = new URL(context.request.url);
  const p = url.searchParams;

  const country = p.get('country');
  const { data, error } = await supabase.rpc('search_research', {
    p_locale: p.get('locale') || 'ko',
    p_q: p.get('q') || null,
    p_country_code: country && country !== 'all' ? country : null,
    p_pubtype: p.get('pubtype') || null,
    p_journal: p.get('journal') || null,
    p_year_from: p.get('year_from') || null,
    p_year_to: p.get('year_to') || null,
    p_limit: Math.min(Number(p.get('limit')) || 15, 100),
    p_offset: Number(p.get('offset')) || 0,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'content-type': 'application/json' } });
  }

  const total = data?.[0]?.total_count ?? 0;
  const items = (data ?? []).map((row) => ({
    pmid: row.pmid,
    title: row.title_en,
    titleTranslated: row.title_translated,
    journal: row.journal,
    pubYear: row.pub_year,
    pubMonth: row.pub_month,
    doi: row.doi,
    abstract: row.abstract_en ?? [],
    abstractTranslated: row.abstract_translated,
    pubmedUrl: row.pubmed_url,
    fullTextUrl: row.full_text_url,
    pubTypes: row.pub_types ?? [],
  }));

  return new Response(JSON.stringify({ items, total }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
