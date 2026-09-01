/*
 * 루트(`/`) 처리를 빌드 결과에 맞춰 정리한다. 빌드 끝에 돈다.
 *
 * ⚠️ 2026-09-01 변경 — 이제 `/` 는 **어느 경우에도 사람에게 대문을 바로 보여주지 않는다.**
 *   `functions/index.ts`(Pages Function)가 쿠키 → 브라우저 언어 → 접속 국가 순으로 보고
 *   해당 언어판으로 302 로 넘긴다(오너 지시). 대문 페이지 자체는 `?lang=choose` 로 남아 있다.
 *
 *   그래서 이 스크립트가 하는 일은 두 가지로 줄었다.
 *   1) 언어가 하나뿐이면 `_redirects` 에 `/ → /xx/` 를 넣는다 — Function 이 없거나
 *      `_routes.json` 에서 `/` 가 빠지는 사고가 나도 대문에 갇히지 않게 하는 이중 안전장치다.
 *   2) **사이트맵에서 `/` 를 항상 뺀다.** 302 로 넘어가는 주소를 사이트맵에 올리면
 *      Search Console 이 "페이지에 리디렉션이 있음"으로 잡는다.
 *
 * 사람이 기억해서 손으로 넣고 빼면 반드시 잊는다. 그래서 **빌드된 결과물을 보고** 판단한다.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const REDIRECTS = path.join(DIST, '_redirects');

/*
 * 블록으로 감싼다. 예전에는 표시를 한 줄에만 달았더니 언어가 늘어도 **규칙 줄이 남아
 * 대문이 계속 가려졌다** — 일부러 시험해서 잡은 버그다(2026-08-07). 지우려면 블록째 지워야 한다.
 */
const START = '# [root-gate:start]';
const END = '# [root-gate:end]';

if (!existsSync(REDIRECTS)) {
  console.error('✗ dist/_redirects 가 없다 — public/_redirects 가 사라졌는지 확인할 것');
  process.exit(1);
}

const locales = (await readdir(DIST, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && /^[a-z]{2}$/.test(d.name))
  .map((d) => d.name)
  .sort();

/** 앞선 빌드가 넣어둔 블록을 통째로 걷어낸다. */
function stripBlock(text) {
  const out = [];
  let inside = false;
  for (const line of text.split('\n')) {
    if (line.startsWith(START)) {
      inside = true;
      continue;
    }
    if (line.startsWith(END)) {
      inside = false;
      continue;
    }
    if (!inside) out.push(line);
  }
  return out;
}

const skipGate = locales.length <= 1;
const only = locales[0] ?? 'ko';
const lines = stripBlock(await readFile(REDIRECTS, 'utf8'));

if (skipGate) {
  // 규칙 순서가 중요하다 — Cloudflare Pages 는 먼저 맞는 규칙을 쓴다. 맨 앞에 둔다.
  lines.unshift(
    START,
    `# 언어가 ${only} 하나뿐이라 대문을 건너뛴다. 언어가 늘면 이 블록은 사라진다.`,
    `/    /${only}/    302`,
    END,
    ''
  );
}
await writeFile(REDIRECTS, lines.join('\n'));

/* 사이트맵에서 `/` 넣고 빼기 */
const sitemap = path.join(DIST, 'sitemap-0.xml');
let sitemapNote = '';
if (existsSync(sitemap)) {
  const xml = await readFile(sitemap, 'utf8');
  // 언어 접두사가 없는 맨 뿌리 주소 하나만 노린다: <url><loc>https://…/</loc>…</url>
  const rootEntry = /<url>\s*<loc>https?:\/\/[^/]+\/<\/loc>.*?<\/url>/s;
  // `/` 는 언제나 다른 주소로 넘어간다(언어 하나면 _redirects, 여럿이면 Function) → 항상 뺀다.
  if (rootEntry.test(xml)) {
    await writeFile(sitemap, xml.replace(rootEntry, ''));
    sitemapNote = ' · 사이트맵에서 / 제외';
  }
}

console.log(
  skipGate
    ? `✓ 루트 정리 — 언어가 ${only} 하나뿐이라 _redirects 로 / → /${only}/${sitemapNote}`
    : `✓ 루트 정리 — 언어 ${locales.length}개(${locales.join(', ')}), / 는 Function 이 언어별로 302${sitemapNote}`
);
