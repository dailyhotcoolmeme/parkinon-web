/*
 * `check-viewport.mjs` 의 PAGES 에 **모든 언어가 한 장씩은 들어 있는지** 검사한다.
 *
 * ★ 왜 있나 (2026-09-02)
 * 화면 검사는 "언어마다 대표 화면을 넣어 둔다"는 원칙으로 만들어졌다 — 레이아웃 사고는
 * 공통 CSS + 그 언어의 글자 길이가 만나서 **언어 단위로 한꺼번에** 터지기 때문이다.
 * 그런데 언어를 새로 열 때 그 원칙을 사람이 기억해야 했고, 실제로 두 번 놓쳤다:
 *   - 2026-08-14 일본어(`word-break: keep-all`) — 오너가 발견
 *   - 2026-09-02 스페인어(푸터 `white-space: nowrap`) — 오너가 발견
 * 둘 다 "그 언어 화면이 검사 목록에 없어서" 통과했다. 사람 대신 이 검사가 막는다.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const locales = (await readdir(path.join(ROOT, 'src/pages'), { withFileTypes: true }))
  .filter((e) => e.isDirectory() && /^[a-z]{2}$/.test(e.name))
  .map((e) => e.name)
  .sort();

const src = await readFile(path.join(ROOT, 'scripts/check-viewport.mjs'), 'utf8');
const paths = [...src.matchAll(/path:\s*'(\/[a-z]{2}\/[^']*)'/g)].map((m) => m[1]);
const covered = new Set(paths.map((p) => p.split('/')[1]));

const missing = locales.filter((l) => !covered.has(l));
if (missing.length) {
  console.error(`\n✗ 화면 검사에 빠진 언어: ${missing.join(', ')}\n`);
  console.error('  scripts/check-viewport.mjs 의 PAGES 에 그 언어 대표 화면을 한 장 추가할 것.');
  console.error("  예) { slug: 'es-home', path: '/es/', states: [{ name: 'default', run: async () => {} }] },");
  console.error('\n  레이아웃 사고는 그 언어의 글자 길이 때문에 언어 단위로 터진다 —');
  console.error('  검사 목록에 없으면 전 페이지가 깨져 있어도 빌드가 그냥 통과한다.\n');
  process.exit(1);
}
console.log(`✓ 화면 검사 언어 커버리지 — ${locales.length}개 언어 전부 포함(${locales.join(', ')})`);
