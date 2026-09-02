/*
 * 빌드 결과물에서 **용어사전 앵커가 실제로 존재하는지** 검사한다.
 *
 * ★ 왜 있나 (2026-09-02): 스페인어 라우트를 프랑스어에서 복제하면서, 임상시험 페이지가
 *   프랑스어 용어사전 앵커(`#que-signifient-les-phases-1-2-et-3-dun-essai-clinique`)를
 *   그대로 물고 왔다. 스페인어 용어사전에 그런 id 는 없으므로 그 링크는 아무 데도 안 간다.
 *   빌드는 통과하고, 사람이 눌러보기 전까지 아무도 모른다.
 *
 *   기존 `check-glossary-terms.mjs` 는 **소스에서 Term 이 용어사전을 가리키는지**를 보고,
 *   이 검사는 **빌드된 HTML 에서 그 앵커가 실제로 존재하는지**를 본다 — 서로 다른 층이다.
 *
 * 대상: 글 본문의 <Term> 뿐 아니라 페이지(.astro)가 직접 만든 링크도 포함된다.
 *   그래서 소스가 아니라 dist 를 본다.
 *
 * 용어사전이 아직 없는 언어(번역 착수 전)는 건너뛴다 — 그 언어는 링크 자체가 아직
 * 만들어지지 않았거나, 만들어졌더라도 용어사전과 함께 고칠 것이기 때문이다.
 */
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const DIST = path.resolve(import.meta.dirname, '../dist');

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name === 'index.html') out.push(p);
  }
  return out;
}

if (!existsSync(DIST)) {
  console.error('✗ dist 가 없다 — 빌드 뒤에 실행할 것');
  process.exit(1);
}

/** 언어별 용어사전 id 집합. 용어사전이 없으면 null. */
const idsByLocale = new Map();
async function glossaryIds(locale) {
  if (idsByLocale.has(locale)) return idsByLocale.get(locale);
  const p = path.join(DIST, locale, 'lifestyle/glossary/index.html');
  let ids = null;
  if (existsSync(p)) {
    const html = await readFile(p, 'utf8');
    ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  }
  idsByLocale.set(locale, ids);
  return ids;
}

const problems = [];
let checked = 0;

for (const file of await walk(DIST)) {
  const html = await readFile(file, 'utf8');
  const rel = path.relative(DIST, file).replace(/\\/g, '/');
  for (const m of html.matchAll(/href="\/([a-z]{2})\/lifestyle\/glossary\/#([^"]+)"/g)) {
    const [, locale, raw] = m;
    const ids = await glossaryIds(locale);
    if (!ids) continue; // 그 언어 용어사전이 아직 없다 → 건너뛴다
    checked++;
    const anchor = decodeURIComponent(raw);
    if (!ids.has(anchor)) problems.push({ rel, locale, anchor });
  }
}

if (problems.length) {
  const seen = new Set();
  console.error('\n✗ 용어사전 앵커 검사 실패 — 가리키는 항목이 그 언어 용어사전에 없다\n');
  for (const p of problems) {
    const key = `${p.rel}|${p.anchor}`;
    if (seen.has(key)) continue;
    seen.add(key);
    console.error(`  ${p.rel}`);
    console.error(`    /${p.locale}/lifestyle/glossary/#${p.anchor}  ← 그런 id 가 없다`);
  }
  console.error('\n  흔한 원인: 다른 언어 라우트를 복제하면서 **그 언어의 앵커를 그대로 들고 온** 경우.');
  console.error('  고치는 법: 빌드된 그 언어 용어사전에서 실제 id 를 읽어서 넣을 것 —');
  console.error('    grep -o \'id="[^"]*"\' dist/<로케일>/lifestyle/glossary/index.html\n');
  process.exit(1);
}

console.log(`✓ 용어사전 앵커 검사 통과 — 링크 ${checked}개`);
