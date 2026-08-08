/*
 * PubMed E-utilities — 파킨슨병 연구 카드(임상시험 페이지 두 번째 블록).
 *
 * ⚠️ 선별 기준(website-plan.md "3. 임상시험" 절, 오너 확정): **3상 이상 또는 메타분석,
 * 또는 주요 저널**(Lancet Neurology, Brain, Movement Disorders, JAMA Neurology, Neurology).
 * 개별 소규모 연구를 대서특필하면 오보가 된다.
 *
 * ⚠️ 저널명은 PubMed [Journal] 필드에서 **정식 명칭이 아니라 ISO 축약명**으로만 걸린다
 * (2026-08-08 실측). "Movement Disorders"·"Lancet Neurology"로 넣으면 0건 — 조용히
 * 다섯 저널 중 둘이 빠진다. 반드시 아래 축약명을 쓸 것: Mov Disord / Lancet Neurol.
 *
 * ⚠️ PubMed API 는 초록(저자가 쓴 요약)과 서지정보만 준다. **논문 전체 본문은 없다** —
 * 대부분 유료(예: Neurology 는 $39/24시간, 기관 인증 없이 개인 결제 가능, 2026-08-08 확인).
 * 그래서 화면에는 "원문 전체 보기(유료)" 링크를 DOI로 따로 건다.
 */

const API_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

const SEARCH_TERM =
  '("Parkinson Disease"[MeSH]) AND (' +
  '("Mov Disord"[Journal]) OR ("Lancet Neurol"[Journal]) OR ("Brain"[Journal]) OR ' +
  '("JAMA Neurol"[Journal]) OR ("Neurology"[Journal]) OR ' +
  '("Meta-Analysis"[Publication Type]) OR ' +
  '("Clinical Trial, Phase III"[Publication Type]) OR ("Clinical Trial, Phase IV"[Publication Type])' +
  ')';

/** 화면에 보일 최대 개수. 나머지는 PubMed 검색 링크로 보낸다(임상시험 목록과 같은 자르기 방식). */
export const MAX_PAPERS = 15;

export interface AbstractSection {
  label: string | null;
  text: string;
}

export interface ResearchPaper {
  pmid: string;
  title: string;
  journal: string;
  pubDate: string;
  pubTypes: string[];
  abstract: AbstractSection[];
  doi: string | null;
  pubmedUrl: string;
  /** DOI로 가는 출판사 원문 링크. 대부분 유료라 화면에서 "유료"임을 밝힐 것. doi 없으면 null. */
  fullTextUrl: string | null;
}

function searchUrl() {
  const params = new URLSearchParams({ term: SEARCH_TERM });
  return `https://pubmed.ncbi.nlm.nih.gov/?${params}`;
}

export interface ResearchPapers {
  shown: ResearchPaper[];
  total: number;
  overflowUrl: string | null;
}

export async function fetchResearchPapers(): Promise<ResearchPapers> {
  const searchParams = new URLSearchParams({
    db: 'pubmed',
    retmode: 'json',
    retmax: String(MAX_PAPERS),
    sort: 'pub date',
    term: SEARCH_TERM,
  });
  const searchRes = await fetch(`${API_BASE}/esearch.fcgi?${searchParams}`);
  if (!searchRes.ok) throw new Error(`PubMed esearch request failed: ${searchRes.status}`);
  const searchData = (await searchRes.json()) as {
    esearchresult: { idlist: string[]; count: string };
  };
  const ids = searchData.esearchresult.idlist;
  const total = Number(searchData.esearchresult.count);
  if (ids.length === 0) return { shown: [], total: 0, overflowUrl: null };

  const fetchParams = new URLSearchParams({ db: 'pubmed', retmode: 'xml', id: ids.join(',') });
  const fetchRes = await fetch(`${API_BASE}/efetch.fcgi?${fetchParams}`);
  if (!fetchRes.ok) throw new Error(`PubMed efetch request failed: ${fetchRes.status}`);
  const xml = await fetchRes.text();

  const shown = parsePubmedXml(xml);
  return {
    shown,
    total,
    overflowUrl: total > shown.length ? searchUrl() : null,
  };
}

/*
 * 가벼운 XML 파싱 — DOMParser 가 없는 빌드 환경(Node/Astro SSG)이라 정규식으로 뽑는다.
 * PubMedArticle 블록 단위로 잘라서 그 안에서만 찾기 때문에, 다른 논문의 값이
 * 섞여 들어가는 사고를 막는다.
 */
function parsePubmedXml(xml: string): ResearchPaper[] {
  const articles = xml.split('<PubmedArticle>').slice(1);
  return articles.map((block) => {
    const pmid = matchOne(block, /<PMID[^>]*>(\d+)<\/PMID>/);
    const title = decodeEntities(matchOne(block, /<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/) ?? '').replace(/<[^>]+>/g, '');
    const journal = decodeEntities(matchOne(block, /<Journal>[\s\S]*?<Title>([\s\S]*?)<\/Title>/) ?? '');
    const year = matchOne(block, /<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/);
    const month = matchOne(block, /<PubDate>[\s\S]*?<Month>(\w+)<\/Month>/);
    const pubTypes = [...block.matchAll(/<PublicationType[^>]*>([\s\S]*?)<\/PublicationType>/g)].map((m) =>
      decodeEntities(m[1])
    );
    const abstractBlock = matchOne(block, /<Abstract>([\s\S]*?)<\/Abstract>/) ?? '';
    const abstract = [...abstractBlock.matchAll(/<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/g)].map((m) => ({
      label: matchOne(m[1], /Label="([^"]*)"/) ?? null,
      text: decodeEntities(m[2]).replace(/<[^>]+>/g, ''),
    }));
    const doi = matchOne(block, /<ArticleId IdType="doi">([\s\S]*?)<\/ArticleId>/);

    return {
      pmid: pmid ?? '',
      title,
      journal,
      pubDate: [year, month].filter(Boolean).join(' '),
      pubTypes,
      abstract,
      doi,
      pubmedUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      fullTextUrl: doi ? `https://doi.org/${doi}` : null,
    };
  });
}

function matchOne(text: string, re: RegExp): string | null {
  return text.match(re)?.[1] ?? null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}
