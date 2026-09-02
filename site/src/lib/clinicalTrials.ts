/*
 * 임상시험 데이터 — Supabase(`clinical_trials`/`trial_locations`/`trial_contacts`/
 * `trial_translations`)에서 읽는다. ClinicalTrials.gov 를 여기서 직접 부르지 않는다
 * (2026-08-08 이후) — 원문 API 호출·오염 제거·페이지네이션은 `scripts/crawl-trials.mjs`
 * (매일 도는 깃허브 액션)의 몫이고, 이 파일은 **빌드 타임에 Supabase 를 읽기만** 한다.
 *
 * ⚠️ 오염 제거("PD-1"·"PD-L1" 키워드 충돌)와 국가명 표기 문제(South Korea 등)는 크롤러
 * 쪽에서 이미 걸러서 저장한 데이터라 여기서는 신경 쓸 필요 없다 — 자세한 내용은
 * `scripts/crawl-trials.mjs` 상단 주석 참고.
 */
import { supabase } from './supabase';

export interface Trial {
  nctId: string;
  title: string;
  /** 그 언어로 번역된 제목. 없으면 null(화면에서 원문+"번역 준비 중" 처리). */
  titleTranslated: string | null;
  /** 원본 값("PHASE2" 등). 화면에서 t(locale, `phase.${phaseKey}`) 로 라벨을 가져올 것. */
  phaseKey: string | null;
  sponsor: string;
  contacts: { name: string; phone?: string; email?: string }[];
  /** 원본 전체 위치. 나라별로 걸러 보여줄 때 이 배열에서 그 나라만 뽑는다. */
  allLocations: { facility: string; city: string; country: string }[];
  lastUpdate: string;
  startDate: string | null;
  startDateEstimated: boolean;
  completionDate: string | null;
  completionDateEstimated: boolean;
  url: string;
}

interface TrialRow {
  nct_id: string;
  title_en: string;
  phase_key: string | null;
  sponsor: string | null;
  start_date: string | null;
  start_date_estimated: boolean;
  completion_date: string | null;
  completion_date_estimated: boolean;
  last_update: string | null;
  url: string;
  trial_locations: { facility: string; city: string | null; country: string }[];
  trial_contacts: { name: string | null; phone: string | null; email: string | null }[];
  trial_translations: { title: string }[];
}

/**
 * 모집 중인 파킨슨병 임상시험 전체를 Supabase 에서 읽는다(국가 무관). 그 언어 번역이
 * 있으면 `titleTranslated` 에 같이 채운다. 빌드 타임에 한 번만 부른다.
 */
export async function fetchAllRecruitingTrials(locale: string): Promise<Trial[]> {
  const { data, error } = await supabase
    .from('clinical_trials')
    .select(
      `nct_id, title_en, phase_key, sponsor, start_date, start_date_estimated,
       completion_date, completion_date_estimated, last_update, url,
       trial_locations(facility, city, country),
       trial_contacts(name, phone, email),
       trial_translations!left(title)`
    )
    // ⚠️ !left 를 안 붙이면 그 언어 번역이 없는 시험은 통째로 안 나온다(inner join 취급).
    .eq('trial_translations.locale', locale)
    .eq('status', 'RECRUITING');

  if (error) throw new Error(`Supabase clinical_trials query failed: ${error.message}`);

  return ((data ?? []) as unknown as TrialRow[]).map((row) => ({
    nctId: row.nct_id,
    title: row.title_en,
    titleTranslated: row.trial_translations[0]?.title ?? null,
    phaseKey: row.phase_key,
    sponsor: row.sponsor ?? '',
    contacts: row.trial_contacts.map((c) => ({ name: c.name ?? '', phone: c.phone ?? undefined, email: c.email ?? undefined })),
    allLocations: row.trial_locations.map((l) => ({ facility: l.facility, city: l.city ?? '', country: l.country })),
    lastUpdate: row.last_update ?? '',
    startDate: row.start_date,
    startDateEstimated: row.start_date_estimated,
    completionDate: row.completion_date,
    completionDateEstimated: row.completion_date_estimated,
    url: row.url,
  }));
}

/**
 * 화면에 한 나라당 최대 이 개수만 보여준다. 미국(212건)·이탈리아(59건)처럼 많은 나라를
 * 다 그리면 페이지가 무거워진다. **자르되 몇 건을 뺐는지는 항상 밝힌다**(overflowUrl).
 */
export const MAX_PER_COUNTRY = 30;

/** 그 나라·조건으로 ClinicalTrials.gov 검색 결과 전체를 보는 링크(자른 나머지를 위해). */
function searchUrl(countryApiName?: string) {
  const params = new URLSearchParams({
    cond: 'Parkinson Disease',
    aggFilters: 'status:rec',
  });
  if (countryApiName) params.set('country', countryApiName);
  return `https://clinicaltrials.gov/search?${params}`;
}

export interface CountryTrials {
  shown: (Trial & { locations: { facility: string; city: string }[] })[];
  total: number;
  overflowUrl: string | null;
}

/**
 * 전체 목록에서 그 나라에 사이트가 있는 시험만 뽑고, 위치도 그 나라 것만 남긴다.
 * 최근 갱신 순으로 정렬하고 `MAX_PER_COUNTRY` 개만 남긴다.
 */
export function trialsForCountry(all: Trial[], countryApiName: string): CountryTrials {
  const matched = all
    .map((t) => ({ ...t, locations: t.allLocations.filter((l) => l.country === countryApiName) }))
    .filter((t) => t.locations.length > 0)
    .sort((a, b) => b.lastUpdate.localeCompare(a.lastUpdate));

  return {
    shown: matched.slice(0, MAX_PER_COUNTRY),
    total: matched.length,
    overflowUrl: matched.length > MAX_PER_COUNTRY ? searchUrl(countryApiName) : null,
  };
}

/** "전체" 탭용 — 나라로 거르지 않고 전체 목록에서 최근 갱신 순으로 자른다(오너 지시 2026-08-08). */
export function trialsForAll(all: Trial[]): CountryTrials {
  const sorted = [...all]
    .map((t) => ({ ...t, locations: t.allLocations }))
    .sort((a, b) => b.lastUpdate.localeCompare(a.lastUpdate));

  return {
    shown: sorted.slice(0, MAX_PER_COUNTRY),
    total: sorted.length,
    overflowUrl: sorted.length > MAX_PER_COUNTRY ? searchUrl() : null,
  };
}

/*
 * 국가 선택 목록 — 제도 1급 7개국과 같다(website-plan.md "제도 축을 쓸 수 있는 나라").
 * 라벨은 여기 안 둔다 — 화면에서 사전 키 `country.<code>` 로 가져온다.
 */
/*
 * 임상시험 탭에 나오는 나라.
 *
 * ⚠️ `research: false` 는 **연구 논문 카드를 그 나라에 대해 조회하지 않는다**는 뜻이다.
 *   시험 목록은 `fetchAllRecruitingTrials` 한 번으로 받아 나라별로 걸러 쓰므로 나라를
 *   늘려도 공짜지만, 연구 논문은 **나라마다 Supabase 조회가 한 번씩** 나간다(무거운
 *   3중 조인이라 예전에 빌드 타임아웃을 낸 적이 있다 — lib/pubmed.ts 위 주석 참고).
 *   `paper_countries` 에 자료가 없는 나라까지 조회하면 순수한 낭비이므로 끈다.
 *   그 나라 논문이 쌓이면 그때 켠다.
 *
 * 중남미 6개국은 2026-09-02 에 추가했다 — 스페인어판을 열고 나서 오너가 지적했다:
 * 멕시코 사람이 임상시험 메뉴에 들어갔는데 자기 나라가 목록에 아예 없었다.
 *
 * ⚠️ 건수는 **우리 DB 기준으로만** 말할 것(2026-09-02 정정). 처음에 "브라질 23 ·
 *    칠레 14 · 멕시코 13 …" 이라고 적었는데, 그건 ClinicalTrials.gov 에
 *    `query.locn=Mexico` 로 물어본 값이라 미국 New Mexico·이탈리아 Perugia 같은 것까지
 *    섞인 수였다. 크롤러와 같은 조건(cond=Parkinson Disease + RECRUITING + conditions 에
 *    실제로 "parkinson" 포함)으로 다시 세니 627건 전체가 우리 DB와 **정확히 일치**했다.
 *    실제 값: 스페인 19 · 브라질 11 · 아르헨티나 3 · 멕시코 2 · 칠레 0 · 콜롬비아 0 · 페루 0.
 *    → 칠레·콜롬비아·페루는 지금 0건이라 **지오 자동선택에서 건너뛴다**(빈 탭으로
 *      떨어뜨리는 것보다 "전체"가 낫다). 건수가 생기면 자동으로 다시 잡힌다.
 */
export const TRIAL_COUNTRIES = [
  { code: 'kr', apiName: 'South Korea', research: true },
  { code: 'us', apiName: 'United States', research: true },
  { code: 'jp', apiName: 'Japan', research: true },
  { code: 'fr', apiName: 'France', research: true },
  { code: 'de', apiName: 'Germany', research: true },
  { code: 'it', apiName: 'Italy', research: true },
  { code: 'au', apiName: 'Australia', research: true },
  /*
   * 스페인 — 스페인어권에서 **임상시험이 가장 많다**(우리 DB 기준 모집중 19건.
   * 브라질 11 · 아르헨티나 3 · 멕시코 2 · 칠레·콜롬비아·페루 0). 처음엔 뺐었다.
   * 광고를 EEA 에 안 내보내기로 한 결정(2026-09-02) 때문인데, 그건 광고와 제도 글
   * 이야기였지 **임상시험 정보와는 상관이 없었다** — 정책을 잘못 넓혀 적용한 것이다.
   *
   * ⚠️ 코드는 반드시 **ISO 국가코드 `es`** 여야 한다. 처음에 `sp` 로 적었더니
   *    지오 자동선택이 `/api/geo` 가 주는 ISO 코드(`ES`)와 안 맞아, 스페인에서
   *    접속해도 자기 나라 탭이 안 잡히고 "전체"로 떨어졌다(2026-09-02 실측).
   *    로케일 `es` 와 글자가 같을 뿐 서로 다른 축이다 — 헷갈려서 바꾸지 말 것.
   */
  { code: 'es', apiName: 'Spain', research: false },
  // 중남미 — 스페인어·포르투갈어판 독자의 나라
  { code: 'br', apiName: 'Brazil', research: false },
  { code: 'mx', apiName: 'Mexico', research: false },
  { code: 'cl', apiName: 'Chile', research: false },
  { code: 'ar', apiName: 'Argentina', research: false },
  { code: 'co', apiName: 'Colombia', research: false },
  { code: 'pe', apiName: 'Peru', research: false },
] as const;

export type TrialCountryCode = (typeof TRIAL_COUNTRIES)[number]['code'];
