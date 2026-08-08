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

/** 저자 소속기관이 그 나라로 태깅된 연구만("국가 탭 하위"). */
export async function fetchResearchPapersForCountry(code: string, locale: string): Promise<ResearchPapers> {
  // 1단계: 그 나라로 태깅된 pmid 목록부터 뽑는다(전체 개수 = 이 목록 길이).
  const { data: countryRows, error: countryError } = await supabase
    .from('paper_countries')
    .select('pmid')
    .eq('country_code', code);

  if (countryError) throw new Error(`Supabase paper_countries query failed: ${countryError.message}`);

  const pmids = (countryRows ?? []).map((r) => r.pmid as string);
  if (pmids.length === 0) return { shown: [], total: 0, overflowUrl: null };

  // 2단계: 그 pmid들만 최근순으로 MAX_PAPERS 개.
  const { data, error } = await supabase
    .from('research_papers')
    .select(SELECT_COLUMNS)
    .eq('paper_translations.locale', locale)
    .in('pmid', pmids)
    .order('pub_year', { ascending: false })
    .order('pub_month', { ascending: false })
    .limit(MAX_PAPERS);

  if (error) throw new Error(`Supabase research_papers (per-country) query failed: ${error.message}`);

  return {
    shown: ((data ?? []) as unknown as PaperRow[]).map(toPaper),
    total: pmids.length,
    overflowUrl: pmids.length > MAX_PAPERS ? searchUrl(code) : null,
  };
}
