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
 * 🚨 논문 번역 범위는 화면 표시 여부가 아니다 — docs/paper-translation-rule.md 필독.
 * 규칙: 그 언어를 쓰는 나라에서 나온 pub_year=2026 논문만 그 언어로 번역한다.
 * (2026-09-03: 이 규칙을 모르고 "화면에 뜨는 전체"로 잘못 짚어 무관한 논문 29건을
 * 잘못 채웠다가 지운 사고가 있었다 — 다시 화면 기준으로 되돌리지 말 것.)
 */
const PAPER_RULE = { ko: ['kr'], ja: ['jp'], fr: ['fr'], pt: ['br'], es: ['mx', 'cl', 'ar', 'co', 'pe'] };

async function missingPapers() {
  const countries = await selectAll('paper_countries', 'pmid, country_code');
  const papers = await selectAll('research_papers', 'pmid, title_en, pub_year');
  const trs = await selectAll('paper_translations', 'pmid, locale');

  const byPmid = new Map(papers.map((p) => [p.pmid, p]));
  const have = new Set(trs.map((t) => `${t.pmid}|${t.locale}`));
  const out = new Map(); // pmid -> {title, langs[]}

  for (const c of countries) {
    const p = byPmid.get(c.pmid);
    if (!p || p.pub_year !== '2026') continue;
    for (const [locale, list] of Object.entries(PAPER_RULE)) {
      if (!list.includes(c.country_code)) continue;
      if (have.has(`${c.pmid}|${locale}`)) continue;
      const entry = out.get(c.pmid) ?? { title: p.title_en, langs: [] };
      if (!entry.langs.includes(locale)) entry.langs.push(locale);
      out.set(c.pmid, entry);
    }
  }
  return out;
}

const paperMap = await missingPapers();
const shownPapers = [...paperMap];

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
section('연구 논문(그 나라 2026년 것만 — docs/paper-translation-rule.md)', shownPapers, (id) => `https://pubmed.ncbi.nlm.nih.gov/${id}/`);
console.log(`---\n클로드에게 **"번역해"** 라고 하시면 채웁니다.`);
