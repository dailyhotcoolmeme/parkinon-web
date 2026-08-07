/*
 * 번역 누락 검사. `npm run build` 끝에 돈다.
 *
 * 사전 키가 빠진 것은 여기서 안 잡는다 — 그건 타입이 잡는다(`astro check` 가 실패한다).
 * 이 스크립트는 **타입이 못 잡는 세 가지**를 본다.
 *
 *   1) 공용 코드에 한글이 직접 박혀 있는가        → 사전을 안 거친 문구 = 번역 누락 예정
 *   2) 페이지가 있는 언어인데 사전이 없는가        → 그 언어 전체가 영어로 폴백된다
 *   3) 글이 언어별로 얼마나 번역됐는가            → 실패시키지 않고 표로만 보여준다
 *
 * 1·2 는 빌드를 실패시킨다. 3 은 진행 상황이라 실패시키지 않는다 —
 * 번역은 점진적으로 하는 일이라 막아 세우면 아무 일도 못 한다.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const HANGUL = /[가-힣]/;

/* 공용 코드 = 모든 언어판이 함께 쓰는 코드. 여기 한글이 있으면 다른 언어에서 그대로 새어 나온다.
   `src/pages/ko/**` 와 `src/content/**` 는 애초에 한국어판 전용이라 검사 대상이 아니다. */
const SHARED_DIRS = ['src/components', 'src/layouts', 'src/lib'];

async function walk(dir, match = /\.(astro|ts|tsx|js|mjs)$/) {
  const out = [];
  for (const name of await readdir(dir)) {
    const full = path.join(dir, name);
    if ((await stat(full)).isDirectory()) out.push(...(await walk(full, match)));
    else if (match.test(name)) out.push(full);
  }
  return out;
}

/*
 * 한글이 "코드에 박힌 문자열"인지 "주석"인지 줄 단위로 가른다.
 * 주석에 한글을 쓰는 건 오히려 권장이므로 반드시 걸러야 한다.
 * 스타일 블록도 통째로 건너뛴다(CSS 주석에 한글 설명이 많다).
 */
function scanFile(text) {
  const hits = [];
  let inBlockComment = false;
  let inStyle = false;
  let exempt = false;

  text.split('\n').forEach((raw, idx) => {
    let line = raw;

    if (line.includes('i18n-exempt:start')) exempt = true;
    if (line.includes('i18n-exempt:end')) {
      exempt = false;
      return;
    }

    if (inStyle) {
      if (line.includes('</style>')) inStyle = false;
      return;
    }
    if (line.includes('<style')) {
      inStyle = true;
      return;
    }

    if (inBlockComment) {
      const end = line.indexOf('*/');
      if (end === -1) return;
      line = line.slice(end + 2);
      inBlockComment = false;
    }
    // 한 줄 안에서 열고 닫는 블록 주석
    line = line.replace(/\/\*[\s\S]*?\*\//g, '');
    const open = line.indexOf('/*');
    if (open !== -1) {
      inBlockComment = true;
      line = line.slice(0, open);
    }
    // 줄 주석 — `https://` 를 주석으로 오인하지 않도록 앞이 콜론이 아닐 때만
    line = line.replace(/(^|[^:])\/\/.*$/, '$1');

    if (!exempt && HANGUL.test(line)) hits.push({ line: idx + 1, text: raw.trim() });
  });

  return hits;
}

let failed = false;

/* ── 1) 공용 코드에 박힌 한글 ───────────────────────────────── */
const leaks = [];
for (const dir of SHARED_DIRS) {
  const full = path.join(ROOT, dir);
  if (!existsSync(full)) continue;
  for (const file of await walk(full)) {
    const hits = scanFile(await readFile(file, 'utf8'));
    if (hits.length) leaks.push({ file: path.relative(ROOT, file), hits });
  }
}
if (leaks.length) {
  failed = true;
  console.error('\n✗ 공용 코드에 한글이 직접 박혀 있다 — 사전(src/i18n)으로 옮길 것');
  console.error('  (정말 번역 대상이 아니면 i18n-exempt:start / i18n-exempt:end 로 감싸고 이유를 적을 것)');
  for (const { file, hits } of leaks) {
    for (const h of hits) console.error(`  ${file}:${h.line}  ${h.text.slice(0, 90)}`);
  }
}

/* ── 2) 페이지는 있는데 사전이 없는 언어 ────────────────────── */
const dictLocales = (await readdir(path.join(ROOT, 'src/i18n')))
  .filter((f) => /^[a-z]{2}\.ts$/.test(f))
  .map((f) => f.replace('.ts', ''));

const distDir = path.join(ROOT, 'dist');
const pageLocales = existsSync(distDir)
  ? (await readdir(distDir, { withFileTypes: true }))
      .filter((d) => d.isDirectory() && /^[a-z]{2}$/.test(d.name))
      .map((d) => d.name)
  : [];

const missingDicts = pageLocales.filter((l) => !dictLocales.includes(l));
if (missingDicts.length) {
  failed = true;
  console.error(`\n✗ 페이지는 있는데 사전이 없는 언어: ${missingDicts.join(', ')}`);
  console.error('  → 그 언어판 전체가 영어로 폴백된다. src/i18n/<언어>.ts 를 만들 것');
}

/* ── 3) 글 번역 현황 ────────────────────────────────────────── */
const articlesRoot = path.join(ROOT, 'src/content/articles');
if (existsSync(articlesRoot)) {
  const entries = await readdir(articlesRoot, { withFileTypes: true });
  const localeDirs = entries.filter((d) => d.isDirectory() && dictLocales.includes(d.name)).map((d) => d.name);

  if (localeDirs.length) {
    const listing = {};
    for (const loc of localeDirs) {
      const base = path.join(articlesRoot, loc);
      const files = await walk(base, /\.(md|mdx)$/);
      listing[loc] = new Set(files.map((f) => path.relative(base, f).replace(/\.(md|mdx)$/, '')));
    }
    const base = listing.ko ?? new Set();
    console.log('\n번역 현황 (한국어 기준)');
    for (const loc of localeDirs) {
      const have = listing[loc];
      const missing = [...base].filter((s) => !have.has(s));
      const mark = loc === 'ko' ? '' : `  빠진 글 ${missing.length}편`;
      console.log(`  ${loc}: ${have.size}편${mark}`);
      for (const m of missing) console.log(`      ⬜ ${m}`);
    }
  }
}

if (failed) {
  console.error('\n번역 검사 실패 — 위 항목을 고칠 것\n');
  process.exit(1);
}
console.log('✓ 번역 검사 통과');
