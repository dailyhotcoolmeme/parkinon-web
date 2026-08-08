/*
 * <style is:global> 클래스 충돌 검사.
 *
 * 배경(2026-08-08 사고): 클리닉 페이지가 검색 결과 카드(클라이언트 JS가 나중에
 * innerHTML로 끼워 넣는 요소)를 제대로 꾸미려고 <style is:global>을 썼는데, 그 안에
 * 있던 `.search-btn`이 Header.astro(모든 페이지에 같이 그려지는 공용 컴포넌트)의
 * `.search-btn`(톱바 돋보기 버튼)과 이름이 겹쳐서 돋보기 아이콘이 초록 사각형으로
 * 깨졌다. Astro는 스코프가 없는(is:global) 규칙은 그 페이지에 같이 렌더링되는 모든
 * 요소에 그대로 먹기 때문에, 공용 컴포넌트와 클래스명이 겹치면 이런 사고가 난다.
 *
 * 이 스크립트는 모든 페이지의 <style is:global> 블록에서 쓰는 클래스 이름을 뽑아서,
 * src/components·src/layouts(모든 페이지에 같이 그려질 수 있는 공용 컴포넌트) 안의
 * class="..." 속성과 겹치는지 대조한다. 겹치면 빌드를 막는다 — 사람이 다시 눈으로
 * 하나하나 대조하지 않아도 되게.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PAGES_DIR = path.join(ROOT, 'src/pages');
const SHARED_DIRS = ['src/components', 'src/layouts'];

async function walk(dir, match = /\.astro$/) {
  const out = [];
  for (const name of await readdir(dir)) {
    const full = path.join(dir, name);
    if ((await stat(full)).isDirectory()) out.push(...(await walk(full, match)));
    else if (match.test(name)) out.push(full);
  }
  return out;
}

/* 설명 주석 안에 "<style is:global>"·".search-btn" 같은 문자열을 그대로 적어 놓으면
   태그로 오인해서 엉뚱한 범위를 긁어온다(2026-08-08 실제로 겪음) — 먼저 블록 주석을
   지운다. */
function stripBlockComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '');
}

/* <style is:global> ... </style> 블록만 뽑는다(스코프 있는 <style>은 충돌 위험이 없다). */
function extractGlobalStyleBlocks(text) {
  const blocks = [];
  const re = /<style\s+is:global\s*>([\s\S]*?)<\/style>/g;
  let m;
  while ((m = re.exec(text))) blocks.push(m[1]);
  return blocks;
}

/* CSS 텍스트에서 클래스 이름을 전부 뽑는다(선택자 구조는 안 본다 — 이름 자체가 겹치면
   위험하므로 보수적으로 넓게 잡는다). */
function extractClassNames(css) {
  const names = new Set();
  for (const m of css.matchAll(/\.([a-zA-Z][\w-]*)/g)) names.add(m[1]);
  return names;
}

/* .astro 파일의 class="..." / class:list={...} 안에서 클래스 이름을 뽑는다. */
function extractUsedClassNames(text) {
  const names = new Set();
  for (const m of text.matchAll(/\bclass="([^"]*)"/g)) {
    for (const c of m[1].split(/\s+/)) if (c) names.add(c);
  }
  for (const m of text.matchAll(/\bclass:list=\{[^}]*\}/g)) {
    for (const c of m[0].matchAll(/['"]([a-zA-Z][\w-]*)['"]/g)) names.add(c[1]);
  }
  return names;
}

let failed = false;

if (existsSync(PAGES_DIR)) {
  /* 공용 컴포넌트가 실제로 쓰는 클래스 이름 전부(스코프 여부는 안 가린다 — is:global
     규칙이 이 클래스명을 가진 요소라면 스코프와 무관하게 덮어쓸 수 있다). */
  const sharedClassNames = new Set();
  const sharedFiles = [];
  for (const dir of SHARED_DIRS) {
    const full = path.join(ROOT, dir);
    if (!existsSync(full)) continue;
    sharedFiles.push(...(await walk(full)));
  }
  for (const file of sharedFiles) {
    for (const name of extractUsedClassNames(stripBlockComments(await readFile(file, 'utf8')))) sharedClassNames.add(name);
  }

  const pageFiles = await walk(PAGES_DIR);
  const collisions = [];
  for (const file of pageFiles) {
    const text = stripBlockComments(await readFile(file, 'utf8'));
    const globalBlocks = extractGlobalStyleBlocks(text);
    if (!globalBlocks.length) continue;
    const globalClassNames = new Set();
    for (const block of globalBlocks) for (const name of extractClassNames(block)) globalClassNames.add(name);
    for (const name of globalClassNames) {
      if (sharedClassNames.has(name)) {
        collisions.push({ file: path.relative(ROOT, file), name });
      }
    }
  }

  if (collisions.length) {
    failed = true;
    console.error('\n✗ <style is:global> 클래스가 공용 컴포넌트(Header/Footer 등)와 이름이 겹친다');
    console.error('  → 겹치는 이름을 페이지 전용 이름으로 바꾸거나, is:global 대신 스코프 있는');
    console.error('    <style>로 옮길 것(카드처럼 클라이언트 JS가 새로 만드는 요소가 아니면 스코프로 충분하다).');
    for (const { file, name } of collisions) console.error(`  ${file}  .${name}`);
  }
}

if (failed) {
  console.error('\nstyle 충돌 검사 실패 — 위 항목을 고칠 것\n');
  process.exit(1);
}
console.log('✓ style 충돌 검사 통과');
