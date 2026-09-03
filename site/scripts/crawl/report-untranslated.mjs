/*
 * 크롤 뒤에 «번역이 안 된 것»을 세어 보고서를 만든다.
 *
 * 자동 번역은 하지 않는다(오너 결정 2026-09-03 — 유료 API 안 씀, 클라우드플레어 AI 는
 * 다른 프로젝트에 써야 함). 대신 메일로 알려 주면 오너가 직접 지시한다.
 *
 * 출력: 표준출력에 마크다운. 번역할 게 없으면 아무것도 찍지 않는다(종료코드 0).
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('SUPABASE_URL / 키가 없다');
const db = createClient(url, key);

const LOCALES = ['ko', 'en', 'ja', 'fr', 'es', 'pt'];
// en 은 원문이 영어라 번역하지 않는다
const TARGETS = LOCALES.filter((l) => l !== 'en');

/*
 * ⚠️ Supabase 는 한 번에 1000행까지만 준다. 번역 테이블은 이미 3천 행이 넘어서
 * 그냥 select 하면 «번역이 없다»고 잘못 세게 된다(2026-09-03 실제로 겪었다).
 * 반드시 range 로 끝까지 넘겨 읽는다.
 */
async function selectAll(table, cols) {
  const PAGE = 1000;
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from(table).select(cols).range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < PAGE) return out;
  }
}

async function missing(table, trTable, idCol, titleCol) {
  const rows = await selectAll(table, `${idCol}, ${titleCol}, created_at`);
  const trs = await selectAll(trTable, `${idCol}, locale`);

  const have = new Set(trs.map((t) => `${t[idCol]}|${t.locale}`));
  const out = new Map(); // id -> {title, langs[]}
  for (const r of rows) {
    const langs = TARGETS.filter((l) => !have.has(`${r[idCol]}|${l}`));
    if (langs.length) out.set(r[idCol], { title: r[titleCol], langs, at: r.created_at });
  }
  return out;
}

const trials = await missing('clinical_trials', 'trial_translations', 'nct_id', 'title_en');
/*
 * 논문은 1만 건이 넘지만 화면에 나오는 것은 «전체 탭 15편 + 나라 탭마다 15편» 뿐이다.
 * 안 나오는 논문까지 세면 매번 1만 건이 뜨니 의미가 없다 — 실제 표시 집합만 센다.
 * 정렬 기준은 화면(src/lib/pubmed.ts)과 같아야 한다: 발행 연도·월 내림차순.
 */
const MAX_PAPERS = 15;
const COUNTRIES = ['kr','us','jp','fr','de','it','au','es','br','mx','cl','ar','co','pe'];

async function shownPmids() {
  const ids = new Set();
  const top = await db.from('research_papers').select('pmid')
    .order('pub_year', { ascending: false }).order('pub_month', { ascending: false })
    .limit(MAX_PAPERS);
  if (top.error) throw top.error;
  top.data.forEach((r) => ids.add(r.pmid));

  for (const code of COUNTRIES) {
    const r = await db.from('research_papers')
      .select('pmid, paper_countries!inner(country_code)')
      .eq('paper_countries.country_code', code)
      .order('pub_year', { ascending: false }).order('pub_month', { ascending: false })
      .limit(MAX_PAPERS);
    if (r.error) throw r.error;
    r.data.forEach((x) => ids.add(x.pmid));
  }
  return ids;
}

const papers = await missing('research_papers', 'paper_translations', 'pmid', 'title_en');
const shown = await shownPmids();
const shownPapers = [...papers].filter(([id]) => shown.has(id));

if (trials.size === 0 && shownPapers.length === 0) process.exit(0);

// 메일이 길면 읽지 않게 된다 — 앞 15건만 보이고 나머지는 숫자로 알린다.
const SHOW = 15;
const line = (id, v, link) => `- [${id}](${link}) — ${v.langs.join('·')}\n  ${v.title}`;

function section(title, entries, linkOf) {
  if (!entries.length) return;
  console.log(`### ${title} ${entries.length}건\n`);
  for (const [id, v] of entries.slice(0, SHOW)) console.log(line(id, v, linkOf(id)));
  if (entries.length > SHOW) console.log(`\n…외 ${entries.length - SHOW}건`);
  console.log('');
}

console.log(`## 번역이 필요한 항목\n`);
section('임상시험', [...trials], (id) => `https://clinicaltrials.gov/study/${id}`);
section('연구 논문(화면에 나오는 것만)', shownPapers, (id) => `https://pubmed.ncbi.nlm.nih.gov/${id}/`);
console.log(`---\n클로드에게 **"번역해"** 라고 하시면 채웁니다.`);
