/*
 * 임상시험 검색+필터+더보기 — Cloudflare Pages Function. 화면에 이미 구운(빌드 타임) 30건과
 * 별개로, 방문 중에 Supabase RPC `search_trials`를 실시간으로 부른다(오너 확정 2026-08-08:
 * "검색은 화면에 보여지는거랑 별개로 db에서 검색되는거 맞지?").
 *
 * anon 키만 쓴다 — RPC는 SELECT 전용이고 테이블 RLS가 이미 공개 읽기를 허용한다.
 */
import { createClient } from '@supabase/supabase-js';

/*
 * ⚠️ 이 표는 `site/src/lib/clinicalTrials.ts` 의 TRIAL_COUNTRIES 와 **반드시 같아야 한다.**
 * 화면에 처음 구워지는 30건은 빌드 타임(그쪽 파일)이 만들고, 검색·"더 보기"는 여기가
 * 만든다. 두 곳이 어긋나면 조용히 틀린 결과가 나간다 —
 * 2026-09-02 실측: 스페인·중남미 7개국을 저쪽에만 추가했더니 여기서는 코드를 못 찾아
 * `?? null` 로 떨어져 **국가 필터가 통째로 사라지고 전 세계 시험이 "멕시코" 패널에
 * 붙었다.** 눈에 안 띄는 종류의 사고라 `scripts/check-trial-countries.mjs` 로 두 목록이
 * 같은지 빌드·배포마다 검사한다. 나라를 늘릴 땐 두 파일을 같이 고칠 것.
 */
const COUNTRY_API_NAME = {
  kr: 'South Korea',
  us: 'United States',
  jp: 'Japan',
  fr: 'France',
  de: 'Germany',
  it: 'Italy',
  au: 'Australia',
  es: 'Spain',
  br: 'Brazil',
  mx: 'Mexico',
  cl: 'Chile',
  ar: 'Argentina',
  co: 'Colombia',
  pe: 'Peru',
};

export async function onRequestGet(context) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = context.env;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const url = new URL(context.request.url);
  const p = url.searchParams;

  const country = p.get('country');
  // 'RECRUITING' | 'CLOSED' | 'ALL' — 안 주면 RPC 기본값(RECRUITING)이 적용돼 예전 동작과 같다.
  const status = p.get('status');
  const { data, error } = await supabase.rpc('search_trials', {
    p_locale: p.get('locale') || 'ko',
    p_q: p.get('q') || null,
    p_country: country && country !== 'all' ? COUNTRY_API_NAME[country] ?? null : null,
    p_phase: p.get('phase') || null,
    p_date_from: p.get('date_from') || null,
    p_date_to: p.get('date_to') || null,
    p_sponsor: p.get('sponsor') || null,
    ...(status ? { p_status: status } : {}),
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
    status: row.status,
  }));

  return new Response(JSON.stringify({ items, total }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
