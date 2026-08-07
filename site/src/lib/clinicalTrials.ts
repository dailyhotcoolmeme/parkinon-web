/*
 * ClinicalTrials.gov API v2 — 모집 중인 파킨슨병 임상시험.
 *
 * ⚠️ API 의 `query.locn`(국가) 파라미터로 걸러내지 않는다. 실제로 써보니 오염이 심하다
 * (2026-08-08 실측, website-plan.md "3. 임상시험" 절 참고):
 *   1) "PD" 약어 충돌 — 암 면역치료 시험의 "PD-1"·"PD-L1" 키워드가 파킨슨병과 겹쳐
 *      매칭된다. 모집 중 673건 중 47건(7%)이 이 오염이었다.
 *   2) 국가명 표기가 흔히 쓰는 이름과 다르다 — 한국은 `Korea, Republic of` 가 아니라
 *      `South Korea` 로 저장돼 있다.
 *
 * 그래서 `query.cond` 로만 전체를 받고(페이지네이션), **우리 코드에서** conditions·
 * locations 필드를 직접 검사한다. 나라별로 API 를 다시 부르지 않는다 — **한 번만 받아서
 * 메모리에서 나라별로 나눈다.**
 */

const API_BASE = 'https://clinicaltrials.gov/api/v2/studies';
const FIELDS = [
  'NCTId',
  'BriefTitle',
  'OverallStatus',
  'Phase',
  'LeadSponsorName',
  'Condition',
  'LocationFacility',
  'LocationCity',
  'LocationCountry',
  'CentralContactName',
  'CentralContactPhone',
  'CentralContactEMail',
  'LastUpdatePostDate',
].join(',');

interface RawStudy {
  protocolSection: {
    identificationModule: { nctId: string; briefTitle: string };
    statusModule?: { lastUpdatePostDateStruct?: { date?: string } };
    sponsorCollaboratorsModule?: { leadSponsor?: { name: string } };
    conditionsModule?: { conditions?: string[] };
    designModule?: { phases?: string[] };
    contactsLocationsModule?: {
      centralContacts?: { name: string; phone?: string; email?: string }[];
      locations?: { facility?: string; city?: string; country?: string }[];
    };
  };
}

export interface Trial {
  nctId: string;
  title: string;
  /** 원본 API 값("PHASE2" 등). 화면에서 t(locale, `phase.${phaseKey}`) 로 라벨을 가져올 것. */
  phaseKey: string | null;
  sponsor: string;
  contacts: { name: string; phone?: string; email?: string }[];
  /** 원본 전체 위치. 나라별로 걸러 보여줄 때 이 배열에서 그 나라만 뽑는다. */
  allLocations: { facility: string; city: string; country: string }[];
  /** ISO 날짜 문자열. 최근 갱신 순으로 정렬하고, 목록이 길 때 자를 기준으로 쓴다. */
  lastUpdate: string;
  url: string;
}

/** MeSH 동의어("PD" 등) 오염을 걸러낸다 — conditions 배열에 실제로 "parkinson" 이 있는지 본다. */
function isRealParkinsons(conditions: string[] | undefined): boolean {
  return (conditions ?? []).some((c) => c.toLowerCase().includes('parkinson'));
}

function toTrial(raw: RawStudy): Trial | null {
  const p = raw.protocolSection;
  if (!isRealParkinsons(p.conditionsModule?.conditions)) return null;

  const allLocations = (p.contactsLocationsModule?.locations ?? [])
    .filter((l) => l.facility && l.country)
    .map((l) => ({ facility: l.facility!, city: l.city ?? '', country: l.country! }));

  return {
    nctId: p.identificationModule.nctId,
    title: p.identificationModule.briefTitle,
    /* 상(phase) 키를 원본 그대로 둔다("PHASE2" 등) — 화면에 보일 라벨(2상/Phase 2)은
       사전(`t(locale, 'phase.PHASE2')`)에서 나라별로 가져온다. 이 파일은 로직 공용이라
       한국어 라벨을 여기 박으면 안 된다(2026-08-08, 위 파일 상단 경고 참고). */
    phaseKey: p.designModule?.phases?.[0] ?? null,
    sponsor: p.sponsorCollaboratorsModule?.leadSponsor?.name ?? '',
    contacts: (p.contactsLocationsModule?.centralContacts ?? []).map((c) => ({
      name: c.name,
      phone: c.phone,
      email: c.email,
    })),
    allLocations,
    lastUpdate: p.statusModule?.lastUpdatePostDateStruct?.date ?? '',
    url: `https://clinicaltrials.gov/study/${p.identificationModule.nctId}`,
  };
}

/**
 * 모집 중인 파킨슨병 임상시험 전체를 받는다(국가 무관, 오염만 제거).
 * 빌드 타임에 한 번만 부른다 — Astro 정적 페이지라 런타임에는 안 돈다.
 */
export async function fetchAllRecruitingTrials(): Promise<Trial[]> {
  const trials: Trial[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      'query.cond': 'Parkinson Disease',
      'filter.overallStatus': 'RECRUITING',
      pageSize: '100',
      fields: FIELDS,
    });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(`${API_BASE}?${params}`);
    if (!res.ok) throw new Error(`ClinicalTrials.gov API request failed: ${res.status}`);
    const data = (await res.json()) as { studies: RawStudy[]; nextPageToken?: string };

    for (const raw of data.studies) {
      const trial = toTrial(raw);
      if (trial) trials.push(trial);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return trials;
}

/**
 * 화면에 한 나라당 최대 이 개수만 보여준다. 미국(212건)·이탈리아(59건)처럼 많은 나라를
 * 다 그리면 페이지가 무거워진다. **자르되 몇 건을 뺐는지는 항상 밝힌다**(overflowUrl).
 */
export const MAX_PER_COUNTRY = 30;

/** 그 나라·조건으로 ClinicalTrials.gov 검색 결과 전체를 보는 링크(자른 나머지를 위해). */
function searchUrl(countryApiName: string) {
  const params = new URLSearchParams({
    cond: 'Parkinson Disease',
    country: countryApiName,
    aggFilters: 'status:rec',
  });
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
