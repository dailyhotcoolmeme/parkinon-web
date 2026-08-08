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
export const TRIAL_COUNTRIES = [
  { code: 'kr', apiName: 'South Korea' },
  { code: 'us', apiName: 'United States' },
  { code: 'jp', apiName: 'Japan' },
  { code: 'fr', apiName: 'France' },
  { code: 'de', apiName: 'Germany' },
  { code: 'it', apiName: 'Italy' },
  { code: 'au', apiName: 'Australia' },
] as const;

export type TrialCountryCode = (typeof TRIAL_COUNTRIES)[number]['code'];
