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

/** 본문에 나오면 안 되는 말. person-first 원칙. */
const BANNED = [
  { re: /\bpatients?\b/i, fix: "people with Parkinson's" },
  { re: /\bsufferers?\b/i, fix: "people with Parkinson's" },
  { re: /\bvictims?\b/i, fix: "people with Parkinson's" },
  { re: /\bcaregivers?\b/i, fix: 'care partner(s)' },
  { re: /\bsuffers? from\b/i, fix: 'has / lives with' },
];

/** 그 언어판 앱에 기능이 없어 쓰면 안 되는 appFeature — src/lib/appShots.ts 와 같아야 한다. */
const UNAVAILABLE_FEATURE = { en: ['community'], fr: ['community'], ja: ['community'] };

/** 생활 요령 허브의 필터탭이 문자열로 비교하는 값. 다르면 필터가 조용히 깨진다. */
const EN_SECTIONS = [
  'Understanding the disease',
  'Getting started',
  'What happens in the body',
  'Everyday living',
  'People and situations',
];

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
  return text;
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

  for (const { re, fix } of BANNED) {
    const m = prose.match(re);
    if (m) problems.push(`${rel}: 금지어 "${m[0]}" → ${fix} 로 바꿀 것`);
  }

  // 한글이 남아 있으면 번역 누락이다.
  const ko = prose.match(/[가-힣]{2,}/);
  if (ko) problems.push(`${rel}: 한글 잔여 "${ko[0]}" — 번역 누락`);

  // /ko/ 링크가 남아 있으면 다른 언어판으로 보내버린다.
  if (/\/ko\//.test(raw)) problems.push(`${rel}: "/ko/" 링크가 남아 있다`);

  // 그 언어에 없는 기능을 소개하면 거짓 광고가 된다.
  const feat = raw.match(/^appFeature:\s*(\S+)/m)?.[1];
  if (feat && (UNAVAILABLE_FEATURE[locale] ?? []).includes(feat)) {
    problems.push(`${rel}: appFeature "${feat}" 는 ${locale} 앱에 없는 기능이다`);
  }

  // section 값은 허브 필터탭과 문자열이 정확히 같아야 한다.
  const section = raw.match(/^section:\s*(.+)$/m)?.[1]?.trim();
  if (locale === 'en' && section && !EN_SECTIONS.includes(section)) {
    problems.push(`${rel}: section "${section}" 은 허브 필터탭 값이 아니다 (${EN_SECTIONS.join(' / ')})`);
  }
}

if (problems.length) {
  failed = true;
  console.error('\n✗ 해외판 용어·구조 검사 실패 — docs/en-style-guide.md 참고');
  for (const p of problems) console.error(`  ${p}`);
} else {
  console.log(`✓ 해외판 용어 검사 통과 (${files.length}편)`);
}

if (failed) process.exit(1);
