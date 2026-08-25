/*
 * 애드센스 심사 전까지 프로덕션에서 막아 둔 로케일 목록이 **세 곳에서 모두 같은지** 검사한다.
 *
 *   1) site/src/pages/robots.txt.ts   — Disallow: /xx/        (크롤러에게 막는다)
 *   2) site/astro.config.mjs          — sitemap filter        (사이트맵에서 뺀다)
 *   3) scripts/merge-deploy.mjs       — BLOCKED_LOCALES       (배포물에서 뺀다)
 *
 * 왜 있는가(2026-08-24 실제 사고):
 * 프랑스어를 추가하면서 robots.txt 와 merge-deploy 에는 fr 를 넣었는데 **사이트맵 필터만
 * 빠뜨렸다.** 그래서 프로덕션에 존재하지도 않는 /fr/ 주소 59개가 사이트맵에 실려 나갔고,
 * 구글 Search Console 이 "사이트맵에 있는데 robots.txt 가 차단한다"며 색인 오류를 통지했다.
 * 세 파일이 서로 떨어져 있어 사람 눈으로는 한 곳을 빠뜨려도 알아채기 어렵다 — 그래서 검사한다.
 *
 * 로케일을 열 때(= 애드센스 통과 후)도 이 검사가 세 곳을 같이 고치도록 강제해 준다.
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

/** astro.config.mjs 의 sitemap filter 안 `/(en|ja|fr)\//` 정규식에서 뽑는다. */
function fromSitemapFilter() {
  const src = readFileSync(path.join(SITE, 'astro.config.mjs'), 'utf8');
  const m = src.match(/!\/\\\/\(([a-z|]+)\)\\\/\/\.test\(page\)/);
  if (!m) throw new Error('astro.config.mjs 에서 sitemap 로케일 필터를 찾지 못했다 — 정규식이 바뀌었는지 확인할 것');
  return new Set(m[1].split('|'));
}

/** merge-deploy.mjs 의 BLOCKED_LOCALES 배열에서 뽑는다. */
function fromMergeDeploy() {
  const src = readFileSync(path.join(ROOT, 'scripts/merge-deploy.mjs'), 'utf8');
  const m = src.match(/BLOCKED_LOCALES\s*=\s*\[([^\]]*)\]/);
  if (!m) throw new Error('merge-deploy.mjs 에서 BLOCKED_LOCALES 를 찾지 못했다');
  return new Set([...m[1].matchAll(/'([a-z]{2})'/g)].map((x) => x[1]));
}

const sets = {
  'robots.txt.ts (Disallow)': fromRobots(),
  'astro.config.mjs (sitemap filter)': fromSitemapFilter(),
  'merge-deploy.mjs (BLOCKED_LOCALES)': fromMergeDeploy(),
};

const show = (s) => (s.size ? [...s].sort().join(', ') : '(없음)');
const all = Object.values(sets).map((s) => [...s].sort().join(','));
const same = all.every((v) => v === all[0]);

if (!same) {
  console.error('\n✗ 차단 로케일 목록이 서로 다르다 — 세 곳을 같은 값으로 맞출 것');
  for (const [label, s] of Object.entries(sets)) console.error(`  ${label.padEnd(36)} → ${show(s)}`);
  console.error('\n  하나만 고치면 "사이트맵엔 있는데 robots.txt 가 막는" 모순이 생겨');
  console.error('  구글 Search Console 이 색인 오류를 보낸다(2026-08-24 실제 사고).');
  process.exit(1);
}

console.log(`✓ 차단 로케일 일치 검사 통과 — ${show(Object.values(sets)[0])}`);
