/*
 * 헤더·푸터 메뉴가 **실제로 존재하는 페이지**를 가리키는지 검사한다.
 *
 * ★ 왜 있나 (2026-09-02): `lib/nav.ts` 의 AVAILABLE 에 그 언어 줄이 없으면 **한국어 메뉴로
 *   폴백한다.** 스페인어를 추가하면서 그 줄을 빠뜨렸더니, 스페인어 헤더에
 *   「Videos de ejercicio」(운동 영상)가 떴고 누르면 404 였다 — 운동 영상은 한국어에만
 *   있는 페이지다. 오너가 실제 화면에서 발견했다.
 *
 *   nav.ts 주석에 "페이지를 만든다 → 이 줄에 키를 추가한다" 라고 적혀 있었지만, 주석은
 *   빠뜨림을 막지 못한다. 빌드 결과물에서 메뉴 링크를 실제로 따라가 본다.
 */
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const DIST = path.resolve(import.meta.dirname, '../dist');
if (!existsSync(DIST)) {
  console.error('✗ dist 가 없다 — 빌드 뒤에 실행할 것');
  process.exit(1);
}

const locales = (await readdir(DIST, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && /^[a-z]{2}$/.test(d.name))
  .map((d) => d.name);

const problems = [];
let checked = 0;

for (const locale of locales) {
  const home = path.join(DIST, locale, 'index.html');
  if (!existsSync(home)) continue;
  const html = await readFile(home, 'utf8');
  // 헤더 메뉴 링크: /<locale>/<something>/
  const hrefs = new Set([...html.matchAll(/href="(\/[a-z]{2}\/[a-z-]+\/)"/g)].map((m) => m[1]));
  for (const href of hrefs) {
    if (!href.startsWith(`/${locale}/`)) continue;
    checked++;
    if (!existsSync(path.join(DIST, href.slice(1), 'index.html'))) {
      problems.push({ locale, href });
    }
  }
}

if (problems.length) {
  console.error('\n✗ 메뉴 대상 검사 실패 — 존재하지 않는 페이지를 가리키는 링크가 있다\n');
  for (const p of problems) console.error(`  ${p.locale} 홈 → ${p.href}  (그런 페이지가 없다)`);
  console.error('\n  흔한 원인: `src/lib/nav.ts` 의 AVAILABLE 에 그 언어 줄이 없어');
  console.error('  **한국어 메뉴로 폴백**한 경우(운동 영상 등 한국 전용 메뉴가 딸려 온다).');
  console.error('  고치는 법: AVAILABLE 에 그 언어가 실제로 여는 메뉴만 적을 것.\n');
  process.exit(1);
}

console.log(`✓ 메뉴 대상 검사 통과 — 링크 ${checked}개 / ${locales.sort().join(', ')}`);
