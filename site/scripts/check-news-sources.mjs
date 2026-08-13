/*
 * 소식 소재 경로가 아직 살아 있는지 확인한다.
 *
 * 왜(오너 지시 2026-08-13): "파킨온 소식 크롤링 방식도 firecrawl이면.. 막힐 경우 대비해서
 * 다른 방식도 넣자." 그날 firecrawl 한도와 WebSearch 한도가 동시에 소진됐다.
 * 소식은 이틀에 한 번 나가야 하는데, 발행하려는 순간에 경로가 막힌 걸 알게 되면 늦는다.
 * **막힌 것을 미리 알고 우회로를 찾아 두기 위한** 스크립트다.
 *
 * 규칙과 우회 경로는 docs/news-sourcing.md 에 있다. 여기서 실패가 나오면 그 문서를
 * 갱신하는 것까지가 한 세트다.
 *
 * 이 스크립트는 **빌드를 막지 않는다.** 외부 사이트 사정으로 실패할 수 있고, 그걸로
 * 배포가 멈추면 안 된다. 확인용으로만 돌린다:  node scripts/check-news-sources.mjs
 */
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/*
 * `need` = 응답 본문에 반드시 있어야 하는 문자열.
 * HTTP 200 만 보고 "된다"고 판단하면 안 된다 — 200 을 주면서 차단 안내문을 내려주는
 * 사이트가 실제로 있다(ssa.gov·medicaid.gov). 그래서 내용까지 확인한다.
 */
const SOURCES = [
  { name: "Parkinson's News Today RSS", url: 'https://parkinsonsnewstoday.com/feed/', need: '<item', role: '소재 발굴 주력 1' },
  { name: 'MedicalXpress parkinson RSS', url: 'https://medicalxpress.com/rss-feed/search/?search=parkinson', need: '<item', role: '소재 발굴 주력 2' },
  { name: "Parkinson's UK RSS", url: 'https://www.parkinsons.org.uk/rss.xml', need: '<item', role: '환자단체' },
  { name: 'PubMed E-utilities', url: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=parkinson&retmax=1&retmode=json', need: 'esearchresult', role: '1차 출처(논문)' },
  { name: 'ClinicalTrials.gov API v2', url: 'https://clinicaltrials.gov/api/v2/studies?query.cond=parkinson&pageSize=1', need: 'protocolSection', role: '1차 출처(임상시험)' },
];

async function probe(s) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 25_000);
  try {
    const res = await fetch(s.url, { headers: { 'user-agent': UA }, signal: ctl.signal, redirect: 'follow' });
    const body = await res.text();
    if (!res.ok) return { ...s, ok: false, why: `HTTP ${res.status}` };
    if (!body.includes(s.need)) return { ...s, ok: false, why: `본문에 "${s.need}" 없음 (${body.length}B — 차단 안내문일 수 있다)` };
    // RSS 면 항목 수까지 세어 준다. 0건이면 살아 있어도 쓸모가 없다.
    const items = (body.match(/<item[\s>]/g) ?? []).length;
    return { ...s, ok: true, note: items ? `${items}건` : '' };
  } catch (e) {
    return { ...s, ok: false, why: e.name === 'AbortError' ? '시간초과' : e.message };
  } finally {
    clearTimeout(timer);
  }
}

const results = await Promise.all(SOURCES.map(probe));
const dead = results.filter((r) => !r.ok);

for (const r of results) {
  const mark = r.ok ? '✓' : '✗';
  const tail = r.ok ? r.note : r.why;
  console.log(`  ${mark} ${r.name.padEnd(30)} ${r.role.padEnd(16)} ${tail}`);
}

if (dead.length === 0) {
  console.log(`\n✓ 소식 소재 경로 ${results.length}개 전부 살아 있다 — firecrawl 없이도 돈다.`);
} else {
  console.log(`\n⚠️ ${dead.length}개 경로가 막혔다. docs/news-sourcing.md 의 우회 순서를 따를 것:`);
  console.log('   ① 리더 프록시  curl -sL "https://r.jina.ai/<원래 URL>"');
  console.log('   ② 그래도 안 되면 대체 경로를 찾아 docs/news-sourcing.md 의 표를 갱신할 것.');
  console.log('   (Wayback 은 과거 스냅샷이라 소식 소재 발굴에는 쓰지 않는다.)');
}
