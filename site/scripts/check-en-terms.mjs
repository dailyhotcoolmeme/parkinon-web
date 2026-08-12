/*
 * 영어(및 해외 언어) 글의 용어 규칙 위반을 잡는다.
 *
 * 왜 있는가(2026-08-12): 영어권 파킨슨 단체 3곳(Parkinson's Foundation·Michael J. Fox
 * Foundation·Parkinson's UK)을 조사해 정한 기준이 docs/en-style-guide.md 에 있는데,
 * 글이 수십 편으로 늘면 사람 눈으로는 못 지킨다. 특히 번역을 여러 갈래로 나눠 돌리면
 * 한 곳만 규칙을 어겨도 알아채기 어렵다.
 *
 * ⚠️ **인용은 검사하지 않는다.** 실제 발표된 논문 제목이나 원문 인용에 patients 가
 *    들어 있으면 그대로 두는 것이 맞다 — 바꾸면 인용 왜곡이다.
 *    실제 사례: drooling-management 의 출처 "…in Parkinson's Disease Patients"(PMC8345955).
 *    그래서 sources 블록·url·quote·attribution·name 은 대상에서 뺀다.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ARTICLES = path.join(ROOT, 'src/content/articles');

/** 검사 대상 언어 — 한국어는 해당 없음. */
const LOCALES = ['en', 'fr', 'ja'];

/*
 * 본문에 나오면 안 되는 말.
 * ⚠️ 언어마다 다르다. 영어는 person-first 라 patient 를 금지하지만, **일본어는 患者さん 이
 *    정상 표현이고 오히려 ケアパートナー 가 쓰이지 않는 말이다**(docs/ja-style-guide.md).
 *    그래서 금지어를 언어별로 나눈다.
 */
const BANNED_JA = [
  { re: /ケアパートナー/, fix: 'ご家族 / 介護者' },
];

const BANNED = [
  { re: /\bpatients?\b/i, fix: "people with Parkinson's" },
  { re: /\bsufferers?\b/i, fix: "people with Parkinson's" },
  { re: /\bvictims?\b/i, fix: "people with Parkinson's" },
  { re: /\bcaregivers?\b/i, fix: 'care partner(s)' },
  { re: /\bsuffers? from\b/i, fix: 'has / lives with' },
];

/*
 * 금지어가 들어간 **제도·기관의 공식 명칭**. 고유명사는 person-first 로 고치면 안 된다 —
 * 이름을 바꾸면 독자가 실제 제도를 검색해도 찾지 못한다. 여기 있는 것만 예외로 통과시킨다.
 *
 * ⚠️ 추가할 때는 **공식 문서에서 그 표기를 실제로 확인하고** 출처를 주석에 남길 것.
 *    "이건 고유명사 같다"는 짐작으로 넣으면 금지어 검사가 조용히 무력해진다.
 */
const PROPER_NOUNS = [
  // PHARMAC(뉴질랜드)의 공식 제도명. 확인: pharmac.govt.nz/medicine-funding-and-supply/
  //   make-an-application/nppa-applications (2026-08-13)
  /Named Patient Pharmaceutical Assessment/g,
  /\bNPPA\b/g,
];

/** 금지어를 찾기 전에 공식 명칭을 지운다. 지운 자리는 공백으로 둬서 단어 경계를 유지한다. */
function stripProperNouns(text) {
  return PROPER_NOUNS.reduce((t, re) => t.replace(re, (m) => ' '.repeat(m.length)), text);
}

/** 그 언어판 앱에 기능이 없어 쓰면 안 되는 appFeature — src/lib/appShots.ts 와 같아야 한다. */
const UNAVAILABLE_FEATURE = { en: ['community'], fr: ['community'], ja: ['community'] };

/*
 * 생활 요령 허브의 필터탭이 문자열로 비교하는 값. 다르면 필터가 **조용히** 깨진다
 * (그 글이 "전체" 탭에만 보이고 분류 탭에서 사라진다). 언어별로 따로 관리한다 —
 * src/pages/<locale>/lifestyle/index.astro 의 SECTIONS 와 반드시 같아야 한다.
 */
const SECTIONS_BY_LOCALE = {
  en: [
    'Understanding the disease',
    'Getting started',
    'What happens in the body',
    'Everyday living',
    'People and situations',
  ],
  ja: ['病気を知る', 'はじめの一歩', '体に起こること', '一日の過ごし方', '人と場面'],
};

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.mdx?$/.test(e.name)) out.push(p);
  }
  return out;
}

/** 인용·출처·URL 을 지운 '우리가 쓴 문장'만 남긴다. */
function proseOnly(raw) {
  const parts = raw.split(/^---$/m);
  const fm = parts[1] ?? '';
  const body = parts.slice(2).join('---');

  // 프론트매터에서 sources 블록을 통째로 뺀다.
  const fmKept = [];
  let inSources = false;
  for (const line of fm.split('\n')) {
    if (/^sources:/.test(line)) { inSources = true; continue; }
    if (inSources) {
      if (/^\S/.test(line)) inSources = false;   // 다음 최상위 키에서 해제
      else continue;
    }
    fmKept.push(line);
  }

  let text = fmKept.join('\n') + '\n' + body;
  text = text.replace(/https?:\/\/\S+/g, ' ');            // URL
  /*
   * 슬러그·파일명은 식별자다. `related: [caregiver-burnout-prevention]` 처럼 슬러그에
   * 금지어가 들어 있어도 그건 문장이 아니다 — 실제로 한 번역 배치가 이 검사를 피하려고
   * related 링크를 엉뚱한 글로 바꿨다(2026-08-12). 슬러그는 대상에서 뺀다.
   * (검색 관점에서도 "caregiver burnout" 은 실제로 많이 검색되는 말이라 URL 에 남기는 편이 낫다.)
   */
  text = text.replace(/^related:.*$/gm, ' ');
  // 파일 경로·import 문도 식별자다. 이미지 파일명(caregiver-woman-couch.jpg)까지 잡으면 안 된다.
  text = text.replace(/^\s*(hero|thumbnail):.*$/gm, ' ');
  text = text.replace(/^import .*$/gm, ' ');
  text = text.replace(/\.{0,2}\/[\w./-]+\.(png|jpe?g|webp|svg|astro|mdx?)/g, ' ');
  text = text.replace(/\/(en|fr|ja)\/[a-z0-9/-]+/g, ' ');   // 내부 링크 경로
  text = text.replace(/\b(quote|attribution|name|url)\s*=\s*"[^"]*"/gs, ' '); // 컴포넌트 인용 prop
  text = text.replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ');                  // MDX 주석 — 지시문에 금지어를 설명할 수 있다
  return text;
}

/*
 * ── 페이지(.astro) 검사 ─────────────────────────────────────
 * 글만 검사하면 놓치는 자리가 있다. 실제로 en/clinical/index.astro 의 CSS 에
 * `content: '자세히 보기 ▾'` 가 박혀 있어 **영어 사용자에게 한글이 보이고 있었다**
 * (2026-08-12 발견). check-i18n 은 <style> 블록을 아예 건너뛰어서 못 잡았고,
 * 이 스크립트도 글만 보고 있었다.
 * CSS 주석은 렌더되지 않으므로, 화면에 나오는 `content:` 값만 본다.
 */
async function checkPages() {
  const PAGES = path.join(ROOT, 'src/pages');
  const out = [];
  for (const loc of LOCALES) {
    const dir = path.join(PAGES, loc);
    let files;
    try { files = await walk(dir); } catch { continue; }
    for (const f of files.filter((x) => x.endsWith('.astro'))) {
      const raw = await readFile(f, 'utf8');
      const rel = path.relative(PAGES, f);
      for (const m of raw.matchAll(/content:\s*(['"])([^'"]*)\1/g)) {
        if (/[가-힣]/.test(m[2])) out.push(`${rel}: CSS content 에 한글 "${m[2]}" — 화면에 그대로 보인다`);
      }
      // 사전을 거치지 않은 한글 표시 문구(주석·CSS 주석 제외)
      const noComments = raw
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/^\s*\/\/.*$/gm, ' ');
      const tag = noComments.match(/>([^<>{}]*[가-힣][^<>{}]*)</);
      if (tag) out.push(`${rel}: 화면 문구에 한글 "${tag[1].trim().slice(0, 30)}"`);
    }
  }
  return out;
}

const files = (await walk(ARTICLES)).filter((f) => {
  const loc = path.relative(ARTICLES, f).split(path.sep)[0];
  return LOCALES.includes(loc);
});

let failed = false;
const problems = [];

for (const file of files) {
  const rel = path.relative(ARTICLES, file);
  const locale = rel.split(path.sep)[0];
  const raw = await readFile(file, 'utf8');
  const prose = proseOnly(raw);

  const banned = locale === 'ja' ? BANNED_JA : BANNED;
  const hay = locale === 'ja' ? prose : stripProperNouns(prose);
  for (const { re, fix } of banned) {
    const m = hay.match(re);
    if (m) problems.push(`${rel}: 금지어 "${m[0]}" → ${fix} 로 바꿀 것`);
  }

  // 한글이 남아 있으면 번역 누락이다.
  const ko = prose.match(/[가-힣]{2,}/);
  if (ko) problems.push(`${rel}: 한글 잔여 "${ko[0]}" — 번역 누락`);

  // /ko/ 링크가 남아 있으면 다른 언어판으로 보내버린다.
  if (/\/ko\//.test(raw)) problems.push(`${rel}: "/ko/" 링크가 남아 있다`);

  /*
   * 글을 쓰는 도구의 마크업이 본문에 새어 들어온 것. 2026-08-13 에 실제로 10편에서
   * `</content>` 가, 한 편에서는 `</invoke>` 까지 나왔다. MDX 는 이걸 열리지 않은 태그로
   * 보고 **빌드를 통째로 실패**시킨다. 여기서 먼저 잡아 어느 파일인지 바로 알 수 있게 한다.
   */
  const stray = raw.match(/<\/?(content|invoke|parameter|function_calls|antml)[\s>]/);
  if (stray) problems.push(`${rel}: 도구 마크업 "${stray[0].trim()}" 이 본문에 남아 있다 — 지울 것`);

  /*
   * frontmatter 의 summary 항목에 따옴표 없이 ": " 가 들어가면 YAML 이 그 줄을 문자열이
   * 아니라 매핑으로 읽는다. 스키마 검사에서 "Expected string, received object" 로 뒤늦게
   * 터지는데 원인이 한눈에 안 보인다(2026-08-13 에 4편). 작은따옴표로 감싸면 된다.
   */
  const fmBlock = raw.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  const sum = fmBlock.match(/^summary:\s*\n((?:\s+-.*\n?)*)/m)?.[1] ?? '';
  for (const line of sum.split('\n')) {
    if (/^\s+-\s+(?!["'])[^\n]*:\s/.test(line)) {
      problems.push(`${rel}: summary 항목에 따옴표 없는 ": " 가 있다 — 작은따옴표로 감쌀 것\n    ${line.trim().slice(0, 70)}`);
      break;
    }
  }

  // 그 언어에 없는 기능을 소개하면 거짓 광고가 된다.
  const feat = raw.match(/^appFeature:\s*(\S+)/m)?.[1];
  if (feat && (UNAVAILABLE_FEATURE[locale] ?? []).includes(feat)) {
    problems.push(`${rel}: appFeature "${feat}" 는 ${locale} 앱에 없는 기능이다`);
  }

  // section 값은 허브 필터탭과 문자열이 정확히 같아야 한다.
  const section = raw.match(/^section:\s*(.+)$/m)?.[1]?.trim();
  const allowed = SECTIONS_BY_LOCALE[locale];
  if (allowed && section && !allowed.includes(section)) {
    problems.push(`${rel}: section "${section}" 은 허브 필터탭 값이 아니다 (${allowed.join(' / ')})`);
  }
}

problems.push(...(await checkPages()));

if (problems.length) {
  failed = true;
  console.error('\n✗ 해외판 용어·구조 검사 실패 — docs/en-style-guide.md 참고');
  for (const p of problems) console.error(`  ${p}`);
} else {
  console.log(`✓ 해외판 용어 검사 통과 (${files.length}편)`);
}

if (failed) process.exit(1);
