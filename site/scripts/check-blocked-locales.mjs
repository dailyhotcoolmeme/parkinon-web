/*
 * 프로덕션에서 막아 둔 로케일 목록이 **네 곳에서 모두 같은지** 검사한다.
 *
 *   1) site/src/pages/robots.txt.ts         — Disallow: /xx/    (크롤러에게 막는다)
 *   2) site/astro.config.mjs                — sitemap filter    (사이트맵에서 뺀다)
 *   3) scripts/merge-deploy.mjs             — BLOCKED_LOCALES   (배포물에서 뺀다)
 *   4) scripts/guard-production-locales.mjs — BLOCKED_LOCALES   (배포 커맨드를 훅으로 막는다)
 *
 * 2026-09-01 현재 **네 곳 모두 비어 있다 = 전 언어 공개**. 08-30 애드센스 거절 후
 * 재심사를 한참 뒤로 미루기로 하면서 오너 지시로 en/ja/fr 을 열었다. 검사 자체는 그대로
 * 둔다 — 재심사 준비로 다시 잠글 때 네 곳을 함께 고치도록 강제해 주는 장치다.
 *
 * 왜 있는가(2026-08-24 실제 사고):
 * 프랑스어를 추가하면서 robots.txt 와 merge-deploy 에는 fr 를 넣었는데 **사이트맵 필터만
 * 빠뜨렸다.** 그래서 프로덕션에 존재하지도 않는 /fr/ 주소 59개가 사이트맵에 실려 나갔고,
 * 구글 Search Console 이 "사이트맵에 있는데 robots.txt 가 차단한다"며 색인 오류를 통지했다.
 * 세 파일이 서로 떨어져 있어 사람 눈으로는 한 곳을 빠뜨려도 알아채기 어렵다 — 그래서 검사한다.
 *
 * 로케일을 열 때도, 다시 막을 때도 이 검사가 네 곳을 같이 고치도록 강제해 준다.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

const SITE = path.resolve(import.meta.dirname, '..');
const ROOT = path.resolve(SITE, '..');

/** robots.txt.ts 의 `Disallow: /xx/` 에서 두 글자 로케일만 뽑는다(/app/·/ko/tools/ 는 제외). */
function fromRobots() {
  const src = readFileSync(path.join(SITE, 'src/pages/robots.txt.ts'), 'utf8');
  return new Set(
    [...src.matchAll(/^Disallow:\s*\/([a-z]{2})\/\s*$/gm)].map((m) => m[1])
  );
}

/*
 * astro.config.mjs 의 sitemap filter 안 `!/\/(en|ja|fr)\//.test(page)` 에서 뽑는다.
 * 그 줄이 아예 없으면 = 아무 언어도 안 막는다 → 빈 집합. (지금 상태가 그렇다.)
 * 필터가 다른 형태로 바뀌면 여기서는 빈 집합으로 읽히는데, 그때는 나머지 세 곳이 비어
 * 있지 않은 한 불일치로 잡힌다 — 안전한 방향(사이트맵에 덜 싣는 쪽)으로만 어긋난다.
 */
function fromSitemapFilter() {
  const src = readFileSync(path.join(SITE, 'astro.config.mjs'), 'utf8');
  const m = src.match(/!\/\\\/\(([a-z|]+)\)\\\/\/\.test\(page\)/);
  return m ? new Set(m[1].split('|')) : new Set();
}

/** BLOCKED_LOCALES 배열을 쓰는 스크립트에서 뽑는다(merge-deploy · 배포 훅). */
function fromBlockedLocales(rel) {
  const src = readFileSync(path.join(ROOT, rel), 'utf8');
  const m = src.match(/BLOCKED_LOCALES\s*=\s*\[([^\]]*)\]/);
  if (!m) throw new Error(`${rel} 에서 BLOCKED_LOCALES 를 찾지 못했다`);
  return new Set([...m[1].matchAll(/'([a-z]{2})'/g)].map((x) => x[1]));
}

const sets = {
  'robots.txt.ts (Disallow)': fromRobots(),
  'astro.config.mjs (sitemap filter)': fromSitemapFilter(),
  'merge-deploy.mjs (BLOCKED_LOCALES)': fromBlockedLocales('scripts/merge-deploy.mjs'),
  'guard-production-locales.mjs (훅)': fromBlockedLocales('scripts/guard-production-locales.mjs'),
};

const show = (s) => (s.size ? [...s].sort().join(', ') : '(없음 — 전 언어 공개)');
const all = Object.values(sets).map((s) => [...s].sort().join(','));
const same = all.every((v) => v === all[0]);

if (!same) {
  console.error('\n✗ 차단 로케일 목록이 서로 다르다 — 네 곳을 같은 값으로 맞출 것');
  for (const [label, s] of Object.entries(sets)) console.error(`  ${label.padEnd(36)} → ${show(s)}`);
  console.error('\n  하나만 고치면 "사이트맵엔 있는데 robots.txt 가 막는" 모순이 생겨');
  console.error('  구글 Search Console 이 색인 오류를 보낸다(2026-08-24 실제 사고).');
  process.exit(1);
}

console.log(`✓ 차단 로케일 일치 검사 통과 — ${show(Object.values(sets)[0])}`);
