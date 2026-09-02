#!/usr/bin/env node
/*
 * PubMed 매일 크롤 — **신규 논문만** Supabase(research_papers 등)에 추가.
 * 깃허브 액션에서 매일 돈다(`.github/workflows/crawl-content.yml`).
 *
 * 선별 기준(website-plan.md "3. 임상시험" 절, 오너 확정): 3상 이상 또는 메타분석,
 * 또는 주요 저널 5곳. 저널명은 PubMed [Journal] 필드에서 ISO 축약명으로만 걸린다
 * (Movement Disorders → "Mov Disord", Lancet Neurology → "Lancet Neurol" — 정식
 * 명칭으로 넣으면 조용히 0건, 2026-08-08 실측).
 *
 * ⚠️ PubMed esearch 는 retstart 가 9,998을 넘으면 페이지네이션이 막힌다(WebEnv/history를
 * 써도 동일) — 연도별로 나눠서 긁는다(연도 하나가 이 캡을 넘을 일은 없다).
 *
 * 국가 태깅은 저자 소속기관([Affiliation]) 텍스트에 나라 이름이 있는지로 추정한다 —
 * 저자 소속 국가일 뿐이라 국제 공동연구는 여러 나라에 동시에 걸릴 수 있다. 표기 변형은
 * 실측해서 확인한 것만 쓴다("United States"만 25건, "USA"까지 더하면 2,786건로 실측 확인,
 * 2026-08-08) — "표기가 다양해서 못 잡는다"고 넘기지 말고 실제 변형을 조사해서 목록에 넣을 것.
 *
 * 매일 도는 이유: 전체를 다시 받지 않는다. esearch로 전체 PMID만 가볍게 받아서(초록·전문
 * 없음) 이미 있는 pmid와 대조 → **새 pmid만** efetch(초록 포함) 해서 채운다.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const API_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const SEARCH_TERM =
  '("Parkinson Disease"[MeSH]) AND (' +
  '("Mov Disord"[Journal]) OR ("Lancet Neurol"[Journal]) OR ("Brain"[Journal]) OR ' +
  '("JAMA Neurol"[Journal]) OR ("Neurology"[Journal]) OR ' +
  '("Meta-Analysis"[Publication Type]) OR ' +
  '("Clinical Trial, Phase III"[Publication Type]) OR ("Clinical Trial, Phase IV"[Publication Type])' +
  ')';

/*
 * 소속기관 주소에서 나라를 알아낸다. 값은 **`src/lib/clinicalTrials.ts` 의 국가 코드**와
 * 같아야 화면의 「연구 결과」 탭이 채워진다(빈 값이면 그 나라 탭이 영원히 0건이다).
 *
 * ⚠️ 단순 부분일치라 **다른 나라 지명에 걸려드는 것을 손으로 막아야 한다.** 실제로 문제가
 *    되는 것들(2026-09-02 확인):
 *      "Mexico"   ← 미국 New Mexico (앨버커키·UNM 이 파킨슨 연구를 많이 낸다)
 *      "Peru"     ← 이탈리아 Perugia
 *      "Chile"    ← 안전(다른 지명 없음)
 *      "Colombia" ← 안전(미국 Columbia / 캐나다 British Columbia 는 철자가 다르다)
 *    그래서 `exclude` 를 둔다 — 그 문자열이 같은 주소에 있으면 그 소속은 세지 않는다.
 */
const COUNTRY_AFFILIATION = {
  kr: { match: ['South Korea', 'Republic of Korea'] },
  us: { match: ['United States', 'USA'] },
  jp: { match: ['Japan'] },
  fr: { match: ['France'] },
  de: { match: ['Germany'] },
  it: { match: ['Italy'] },
  au: { match: ['Australia'] },
  // 스페인어·포르투갈어판 독자의 나라 (2026-09-02 추가)
  es: { match: ['Spain', 'España'] },
  br: { match: ['Brazil', 'Brasil'] },
  mx: { match: ['Mexico', 'México'], exclude: ['New Mexico', 'Nuevo México'] },
  cl: { match: ['Chile'] },
  ar: { match: ['Argentina'] },
  co: { match: ['Colombia'] },
  pe: { match: ['Peru', 'Perú'], exclude: ['Perugia'] },
};

const MONTH_NUMBER = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ncbiFetch(url, attempt = 1) {
  const res = await fetch(url);
  if (res.status === 429 && attempt <= 4) {
    await sleep(2500 * attempt);
    return ncbiFetch(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`NCBI request failed: ${res.status} ${url}`);
  return res;
}

/** 연도별로 나눠서 전체 PMID를 받는다 — retstart 9,998 캡 회피. */
async function fetchAllPmids() {
  const currentYear = new Date().getFullYear();
  const allIds = [];
  for (let year = 1970; year <= currentYear + 1; year++) {
    const term = `${SEARCH_TERM} AND ("${year}"[Date - Publication])`;
    let retstart = 0;
    const retmax = 500;
    for (;;) {
      const params = new URLSearchParams({ db: 'pubmed', retmode: 'json', term, retstart: String(retstart), retmax: String(retmax) });
      const res = await ncbiFetch(`${API_BASE}/esearch.fcgi?${params}`);
      const json = await res.json();
      const ids = json.esearchresult?.idlist ?? [];
      allIds.push(...ids);
      const total = Number(json.esearchresult?.count ?? 0);
      retstart += retmax;
      await sleep(400);
      if (retstart >= total || ids.length === 0) break;
    }
  }
  return [...new Set(allIds)];
}

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function matchOne(text, re) {
  return text.match(re)?.[1] ?? null;
}

function parseArticle(block) {
  const pmid = matchOne(block, /<PMID[^>]*>(\d+)<\/PMID>/);
  const title = decodeEntities(matchOne(block, /<ArticleTitle[^>]*>([\s\S]*?)<\/ArticleTitle>/) ?? '').replace(/<[^>]+>/g, '');
  const journal = decodeEntities(matchOne(block, /<Journal>[\s\S]*?<Title>([\s\S]*?)<\/Title>/) ?? '');
  const year = matchOne(block, /<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/);
  const monthRaw = matchOne(block, /<PubDate>[\s\S]*?<Month>(\w+)<\/Month>/);
  const month = monthRaw ? (MONTH_NUMBER[monthRaw] ?? Number(monthRaw)) || null : null;
  // ⚠️ \b(단어 경계) 필수 — PubMed XML은 각 <PublicationType>을 <PublicationTypeList>로
  // 감싸는데, \b 없이는 "PublicationType"이 "PublicationTypeList"의 앞부분과도 매칭돼서
  // 첫 <PublicationType> 태그 전체가 그대로 안으로 삼켜졌다(2026-08-08 발견 — DB 전체
  // 11,641건 연구 논문의 pubtype에 "<PublicationType UI=\"...\">실제값" 형태로 태그가
  // 그대로 저장돼 있었다. 배지 매칭이 그 값을 못 찾아서 거의 모든 논문이 배지가 적게
  // 나오고 있었다).
  const pubTypes = [...block.matchAll(/<PublicationType\b[^>]*>([\s\S]*?)<\/PublicationType>/g)].map((m) => decodeEntities(m[1]));
  const abstractBlock = matchOne(block, /<Abstract>([\s\S]*?)<\/Abstract>/) ?? '';
  const abstract = [...abstractBlock.matchAll(/<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/g)].map((m) => ({
    label: matchOne(m[1], /Label="([^"]*)"/),
    text: decodeEntities(m[2]).replace(/<[^>]+>/g, ''),
  }));
  const doi = matchOne(block, /<ArticleId IdType="doi">([\s\S]*?)<\/ArticleId>/);
  const affiliations = [...block.matchAll(/<Affiliation>([\s\S]*?)<\/Affiliation>/g)].map((m) => decodeEntities(m[1]));

  const countries = Object.entries(COUNTRY_AFFILIATION)
    .filter(([, { match, exclude }]) =>
      affiliations.some(
        (aff) =>
          match.some((alias) => aff.includes(alias)) &&
          !(exclude ?? []).some((bad) => aff.includes(bad)),
      ),
    )
    .map(([code]) => code);

  return {
    pmid,
    title,
    journal,
    pubYear: year,
    pubMonth: month,
    pubTypes,
    abstract,
    doi,
    countries,
    pubmedUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    fullTextUrl: doi ? `https://doi.org/${doi}` : null,
  };
}

async function fetchAndUpsert(pmids) {
  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < pmids.length; i += BATCH) {
    const batch = pmids.slice(i, i + BATCH);
    const params = new URLSearchParams({ db: 'pubmed', retmode: 'xml', id: batch.join(',') });
    const res = await ncbiFetch(`${API_BASE}/efetch.fcgi?${params}`);
    const xml = await res.text();
    const articles = xml.split('<PubmedArticle>').slice(1).map(parseArticle).filter((a) => a.pmid);

    const { error: papersError } = await supabase.from('research_papers').upsert(
      articles.map((a) => ({
        pmid: a.pmid,
        title_en: a.title,
        journal: a.journal,
        pub_year: a.pubYear,
        pub_month: a.pubMonth,
        doi: a.doi,
        abstract_en: a.abstract,
        pubmed_url: a.pubmedUrl,
        full_text_url: a.fullTextUrl,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'pmid' }
    );
    if (papersError) throw new Error(`research_papers upsert failed: ${papersError.message}`);

    // upsert(ignoreDuplicates) — 유니크 제약(pmid, pubtype)/(pmid, country_code) 덕분에
    // 이 배치를 다시 돌려도(재실행·부분 재시도) 중복이 쌓이지 않는다(2026-08-08 사고 이후 추가).
    const pubtypeRows = articles.flatMap((a) => a.pubTypes.map((pubtype) => ({ pmid: a.pmid, pubtype })));
    const countryRows = articles.flatMap((a) => a.countries.map((country_code) => ({ pmid: a.pmid, country_code })));
    if (pubtypeRows.length) {
      const { error } = await supabase.from('paper_pubtypes').upsert(pubtypeRows, { onConflict: 'pmid,pubtype', ignoreDuplicates: true });
      if (error) throw new Error(`paper_pubtypes upsert failed: ${error.message}`);
    }
    if (countryRows.length) {
      const { error } = await supabase.from('paper_countries').upsert(countryRows, { onConflict: 'pmid,country_code', ignoreDuplicates: true });
      if (error) throw new Error(`paper_countries upsert failed: ${error.message}`);
    }

    inserted += articles.length;
    console.log(`  ...${inserted}/${pmids.length}`);
    await sleep(400);
  }
  return inserted;
}

/*
 * `--retag-countries` — 이미 받아 둔 논문의 **나라 표시만** 다시 붙인다.
 *
 * 평소 실행은 "아직 없는 PMID"만 받으므로, COUNTRY_AFFILIATION 에 나라를 새로 추가해도
 * 옛날 논문에는 영원히 안 붙는다. 2026-09-02 에 스페인·중남미 6개국을 추가하면서 실제로
 * 그랬다 — 추가만 하고 두면 그 나라 「연구 결과」 탭이 계속 0건이다. 이 모드는 전량을 다시
 * 훑어 `paper_countries` 만 채운다(논문 본문·초록은 건드리지 않는다).
 * upsert(ignoreDuplicates) 라 몇 번을 돌려도 중복이 안 쌓인다.
 */
async function retagCountries() {
  console.log('Re-tagging countries for papers already stored...');
  const pmids = [];
  for (let from = 0; ; from += 1000) {
    const { data: page, error } = await supabase.from('research_papers').select('pmid').range(from, from + 999);
    if (error) throw new Error(`research_papers select failed: ${error.message}`);
    if (!page || page.length === 0) break;
    pmids.push(...page.map((r) => r.pmid));
    if (page.length < 1000) break;
  }
  console.log(`${pmids.length} papers to re-tag.`);

  const seen = {};
  let done = 0;
  for (let i = 0; i < pmids.length; i += 200) {
    const chunk = pmids.slice(i, i + 200);
    const params = new URLSearchParams({ db: 'pubmed', id: chunk.join(','), retmode: 'xml' });
    const res = await ncbiFetch(`${API_BASE}/efetch.fcgi?${params}`);
    const xml = await res.text();
    const articles = xml.split('<PubmedArticle>').slice(1).map(parseArticle).filter((a) => a.pmid);
    const rows = articles.flatMap((a) => a.countries.map((country_code) => ({ pmid: a.pmid, country_code })));
    for (const r of rows) seen[r.country_code] = (seen[r.country_code] ?? 0) + 1;
    if (rows.length) {
      const { error } = await supabase
        .from('paper_countries')
        .upsert(rows, { onConflict: 'pmid,country_code', ignoreDuplicates: true });
      if (error) throw new Error(`paper_countries upsert failed: ${error.message}`);
    }
    done += articles.length;
    console.log(`  ...${done}/${pmids.length}`);
    await sleep(400);
  }
  console.log('Country tags found: ' + JSON.stringify(seen));
}

async function main() {
  if (process.argv.includes('--retag-countries')) {
    await retagCountries();
    return;
  }

  console.log('Collecting current PMIDs matching criteria (year-bucketed)...');
  const allPmids = await fetchAllPmids();
  console.log(`Found ${allPmids.length} matching PMIDs total.`);

  // ⚠️ PostgREST는 .range() 없이 부르면 기본 1,000행만 준다(2026-08-08 실측 사고 —
  // 11,641건 중 1,000건만 "있음"으로 잡혀 나머지 10,641건을 신규로 오판하고 다시 받았다).
  // 반드시 끝까지 페이지네이션할 것.
  const existing = new Set();
  for (let from = 0; ; from += 1000) {
    const { data: page, error: existingError } = await supabase
      .from('research_papers')
      .select('pmid')
      .range(from, from + 999);
    if (existingError) throw new Error(`research_papers select failed: ${existingError.message}`);
    if (!page || page.length === 0) break;
    for (const row of page) existing.add(row.pmid);
    if (page.length < 1000) break;
  }

  const newPmids = allPmids.filter((id) => !existing.has(id));
  console.log(`${newPmids.length} new PMIDs to fetch (already have ${existing.size}).`);

  if (newPmids.length === 0) {
    console.log('Nothing new. Done.');
    return;
  }

  const inserted = await fetchAndUpsert(newPmids);
  console.log(`Done. Inserted/updated ${inserted} papers.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
