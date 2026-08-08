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
  const { data, error, count } = await supabase
    .from('research_papers')
    .select(SELECT_COLUMNS, { count: 'exact' })
    .eq('paper_translations.locale', locale)
    .order('pub_year', { ascending: false })
    .order('pub_month', { ascending: false })
    .limit(MAX_PAPERS);

  if (error) throw new Error(`Supabase research_papers query failed: ${error.message}`);

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
  const { data, error, count } = await supabase
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
    .limit(MAX_PAPERS);

  if (error) throw new Error(`Supabase research_papers (per-country) query failed: ${error.message}`);

  const total = count ?? 0;
  if (total === 0) return { shown: [], total: 0, overflowUrl: null };

  return {
    shown: ((data ?? []) as unknown as PaperRow[]).map(toPaper),
    total,
    overflowUrl: total > MAX_PAPERS ? searchUrl(code) : null,
  };
}
