/*
 * 연구 카드 데이터 — Supabase(`research_papers`/`paper_pubtypes`/`paper_countries`/
 * `paper_translations`)에서 읽는다. PubMed 를 여기서 직접 부르지 않는다(2026-08-08 이후) —
 * 원문 수집·저널 축약명 함정·저자 소속기관 기반 국가 태깅은 `scripts/crawl-pubmed.mjs`
 * (매일 도는 깃허브 액션)의 몫이고, 이 파일은 **빌드 타임에 Supabase 를 읽기만** 한다.
 *
 * 선별 기준(3상 이상/메타분석/주요 저널 5곳)·저널 ISO 축약명 함정·저자 소속기관 기반
 * 국가 태깅의 한계(국제 공동연구는 여러 나라에 동시에 걸림)는 크롤러 쪽 주석 참고.
 */
import { supabase } from './supabase';

export const MAX_PAPERS = 15;

/*
 * ⚠️ 빌드가 랜덤하게 깨지던 것을 여기서 막는다 (2026-08-14).
 *
 * 증상: `canceling statement due to statement timeout` 으로 /ko/clinical · /en/clinical ·
 * /ja/clinical 중 아무거나 하나가 실패해 빌드 전체가 죽는다. 연속 3번 실패한 뒤 4번째에
 * 통과했다 — 특정 나라·특정 언어 문제가 아니다.
 *
 * 원인: 이 조회는 3중 조인(paper_pubtypes · paper_translations · paper_countries)에
 * `count: 'exact'` 까지 붙어 있어 한 건에 0.4~1.2초가 걸린다. 2026-08-08 에 **페이지 안에서는**
 * 순차 호출로 바꿔 뒀지만(clinical/index.astro 의 for 루프), Astro 는 ko·en·ja 세 페이지를
 * **동시에** 렌더하므로 세 갈래가 겹쳐 DB 에 몰린다. 언어가 늘면 그만큼 더 몰린다.
 *
 * 그래서 라이브러리 쪽에서 두 겹으로 막는다.
 *   1) 동시 실행 수를 제한한다 — 지금 실질 동시 수(언어 3개)와 같은 값이라 느려지지 않고,
 *      언어가 늘어도 부하가 따라 늘지 않는다.
 *   2) 일시적 오류(타임아웃·연결 끊김)면 물러섰다가 다시 시도한다. 빌드 타임 1회 호출이라
 *      몇 초 늘어나는 것은 무방하고, 실패해서 배포가 막히는 것보다 훨씬 낫다.
 * 진짜 오류(문법 오류·권한 등)는 재시도하지 않고 그대로 터뜨린다 — 조용히 삼키면 안 된다.
 */
const MAX_INFLIGHT = 3;
const RETRIES = 4;
let inflight = 0;
const waiting: (() => void)[] = [];

async function withGate<T>(run: () => Promise<T>): Promise<T> {
  while (inflight >= MAX_INFLIGHT) await new Promise<void>((resolve) => waiting.push(resolve));
  inflight++;
  try {
    return await run();
  } finally {
    inflight--;
    waiting.shift()?.();
  }
}

/* PostgreSQL 57014 = query_canceled(statement timeout). 그 밖에 네트워크가 끊긴 경우도 포함. */
function isTransient(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === '57014') return true;
  return /statement timeout|timeout|fetch failed|ECONNRESET|socket hang up/i.test(error.message ?? '');
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface QueryResult<T> {
  data: T | null;
  error: { code?: string; message?: string } | null;
  count: number | null;
}

/*
 * build 는 매 시도마다 **새로** 쿼리를 만들어야 한다 — supabase 쿼리 빌더는 thenable 이라
 * 한 번 await 하면 재사용할 수 없다(같은 객체를 다시 await 하면 재요청이 나가지 않는다).
 */
async function runQuery<T>(label: string, build: () => PromiseLike<QueryResult<T>>): Promise<QueryResult<T>> {
  let lastError: { code?: string; message?: string } | null = null;

  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    const result = await withGate(() => Promise.resolve(build()));
    if (!result.error) return result;

    lastError = result.error;
    if (!isTransient(result.error) || attempt === RETRIES) break;

    const backoff = 500 * 2 ** (attempt - 1);
    /* i18n-exempt:start — 빌드 로그에만 찍히는 개발자용 메시지다. 화면에 나가지 않는다. */
    console.warn(`[pubmed] ${label} 일시적 실패(${attempt}/${RETRIES}) — ${backoff}ms 후 재시도: ${result.error.message}`);
    /* i18n-exempt:end */
    await sleep(backoff);
  }

  throw new Error(`Supabase ${label} query failed: ${lastError?.message}`);
}

export interface AbstractSection {
  label: string | null;
  text: string;
}

export interface ResearchPaper {
  pmid: string;
  title: string;
  titleTranslated: string | null;
  abstract: AbstractSection[];
  abstractTranslated: AbstractSection[] | null;
  journal: string;
  pubYear: string | null;
  pubMonth: number | null;
  pubTypes: string[];
  doi: string | null;
  pubmedUrl: string;
  fullTextUrl: string | null;
}

interface PaperRow {
  pmid: string;
  title_en: string;
  journal: string | null;
  pub_year: string | null;
  pub_month: number | null;
  doi: string | null;
  abstract_en: AbstractSection[] | null;
  pubmed_url: string;
  full_text_url: string | null;
  paper_pubtypes: { pubtype: string }[];
  paper_translations: { title: string; abstract: AbstractSection[] }[];
}

const SELECT_COLUMNS = `
  pmid, title_en, journal, pub_year, pub_month, doi, abstract_en, pubmed_url, full_text_url,
  paper_pubtypes(pubtype),
  paper_translations!left(title, abstract)
`;

function toPaper(row: PaperRow): ResearchPaper {
  const tr = row.paper_translations[0];
  return {
    pmid: row.pmid,
    title: row.title_en,
    titleTranslated: tr?.title ?? null,
    abstract: row.abstract_en ?? [],
    abstractTranslated: tr?.abstract ?? null,
    journal: row.journal ?? '',
    pubYear: row.pub_year,
    pubMonth: row.pub_month,
    pubTypes: row.paper_pubtypes.map((p) => p.pubtype),
    doi: row.doi,
    pubmedUrl: row.pubmed_url,
    fullTextUrl: row.full_text_url,
  };
}

function searchUrl(countryCode?: string) {
  // 표시용 폴백 링크 — 정확한 원본 검색식은 scripts/crawl-pubmed.mjs 에 있다.
  const base = 'https://pubmed.ncbi.nlm.nih.gov/?term=Parkinson+Disease';
  return countryCode ? `${base}+AND+${countryCode}%5BAffiliation%5D` : base;
}

export interface ResearchPapers {
  shown: ResearchPaper[];
  total: number;
  overflowUrl: string | null;
}

/** 나라 무관 전체("전체" 탭용). */
export async function fetchResearchPapers(locale: string): Promise<ResearchPapers> {
  const { data, count } = await runQuery<PaperRow[]>('research_papers', () =>
    supabase
      .from('research_papers')
      .select(SELECT_COLUMNS, { count: 'exact' })
      .eq('paper_translations.locale', locale)
      .order('pub_year', { ascending: false })
      .order('pub_month', { ascending: false })
      .limit(MAX_PAPERS)
  );

  const total = count ?? 0;
  return {
    shown: ((data ?? []) as unknown as PaperRow[]).map(toPaper),
    total,
    overflowUrl: total > MAX_PAPERS ? searchUrl() : null,
  };
}

/**
 * 저자 소속기관이 그 나라로 태깅된 연구만("국가 탭 하위").
 *
 * ⚠️ 처음엔 "그 나라 pmid 목록을 먼저 뽑고 그 목록으로 다시 조회"하는 2단계로 짰다가 두 번
 * 사고를 냈다(2026-08-08): (1) 1단계 조회에 `.range()`가 없어서 PostgREST 기본 1,000행
 * 한도에 걸려 미국(2,786건)이 1,000건으로 잘렸다 — 크롤러 쪽 같은 함정이 실제 중복 삽입
 * 사고로 번졌다. (2) 페이지네이션으로 고쳤더니 2단계의 `.in('pmid', 수천 개)`가 URL이 너무
 * 길어져 400 Bad Request. **두 문제 다 원인이 같다 — "목록을 뽑아서 다시 필터링"하는
 * 2단계 구조 자체가 문제였다.** `paper_countries!inner(...)`로 한 번에 조인·필터링하는
 * 걸로 바꿔서 이 함정 자체를 없앴다 — 데이터가 얼마나 크든 상관없다.
 */
export async function fetchResearchPapersForCountry(code: string, locale: string): Promise<ResearchPapers> {
  const { data, count } = await runQuery<PaperRow[]>(`research_papers (per-country ${code}/${locale})`, () =>
    supabase
      .from('research_papers')
      .select(
        `pmid, title_en, journal, pub_year, pub_month, doi, abstract_en, pubmed_url, full_text_url,
         paper_pubtypes(pubtype),
         paper_translations!left(title, abstract),
         paper_countries!inner(country_code)`,
        { count: 'exact' }
      )
      .eq('paper_countries.country_code', code)
      .eq('paper_translations.locale', locale)
      .order('pub_year', { ascending: false })
      .order('pub_month', { ascending: false })
      .limit(MAX_PAPERS)
  );

  const total = count ?? 0;
  if (total === 0) return { shown: [], total: 0, overflowUrl: null };

  return {
    shown: ((data ?? []) as unknown as PaperRow[]).map(toPaper),
    total,
    overflowUrl: total > MAX_PAPERS ? searchUrl(code) : null,
  };
}
