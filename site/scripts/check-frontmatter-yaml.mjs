/*
 * 프론트매터가 YAML 로 안전하게 읽히는지 검사한다.
 *
 * ★ 왜 있나 (2026-09-02): `summary:` 항목에 `: `(콜론+공백)가 들어가면 YAML 이 그 줄을
 *   문자열이 아니라 **매핑**으로 읽어 버려서, Astro 의 콘텐츠 스키마 검증이
 *   "Expected string, received object" 로 실패한다. 번역 중에 두 번 연속으로 이걸 만났다.
 *   스페인어·포르투갈어처럼 문장 부호 습관이 다른 언어를 추가하면 더 자주 밟게 된다.
 *
 *   빌드가 실패하니 사고로 이어지진 않지만, **한 편 쓸 때마다 빌드를 돌려봐야 아는 것**이
 *   문제다. 이 검사는 어느 파일 어느 줄인지 바로 알려주고 고치는 법까지 알려준다.
 *
 * 고치는 법: 그 줄 전체를 작은따옴표로 감싼다. 안에 작은따옴표가 있으면 '' 로 두 번 쓴다.
 *   summary:
 *     - '앞부분: 뒷부분'
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ARTICLES = path.resolve(import.meta.dirname, '../src/content/articles');

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith('.mdx')) out.push(p);
  }
  return out;
}

const problems = [];
for (const file of await walk(ARTICLES)) {
  const rel = path.relative(ARTICLES, file).replace(/\\/g, '/');
  const lines = (await readFile(file, 'utf8')).split('\n');
  let inList = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^(summary|hashtags):\s*$/.test(l)) { inList = true; continue; }
    if (inList) {
      if (/^\S/.test(l)) { inList = false; continue; }
      const m = l.match(/^\s+-\s+(.*)$/);
      if (!m) continue;
      const v = m[1].trim();
      // 이미 따옴표로 감싼 값은 안전하다
      if (/^['"]/.test(v)) continue;
      if (v.includes(': ')) problems.push({ rel, line: i + 1, v });
    }
  }
}

if (problems.length) {
  console.error('\n✗ 프론트매터 YAML 검사 실패 — 목록 항목에 콜론+공백이 그대로 있다\n');
  for (const p of problems) {
    console.error(`  ${p.rel}:${p.line}`);
    console.error(`    ${p.v.slice(0, 90)}${p.v.length > 90 ? '…' : ''}`);
  }
  console.error('\n  YAML 은 이 줄을 문자열이 아니라 **매핑**으로 읽어 콘텐츠 스키마 검증이 깨진다.');
  console.error("  고치는 법: 그 줄을 작은따옴표로 감쌀 것 — `- '앞: 뒤'`");
  console.error("  값 안에 작은따옴표가 있으면 '' 로 두 번 쓴다.\n");
  process.exit(1);
}

console.log('✓ 프론트매터 YAML 검사 통과');
