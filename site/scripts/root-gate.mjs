/*
 * 대문(`/`)을 언제 보여줄지 정한다. 빌드 끝에 돈다.
 *
 * 언어가 하나뿐이면 대문은 방해만 된다 — 버튼이 하나뿐인 문을 지나게 하는 셈이다.
 * 그때는 `_redirects` 에 `/ → /ko/` 를 넣어 대문을 건너뛰고, 사이트맵에서도 `/` 를 뺀다
 * (리다이렉트되는 주소를 사이트맵에 올리면 Search Console 이 문제로 잡는다).
 * 두 번째 언어가 생기면 둘 다 되돌려 대문이 드러나게 한다.
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
  if (skipGate && rootEntry.test(xml)) {
    await writeFile(sitemap, xml.replace(rootEntry, ''));
    sitemapNote = ' · 사이트맵에서 / 제외';
  } else if (!skipGate && !rootEntry.test(xml)) {
    // 대문을 쓰는데 사이트맵에 없다면 Astro 쪽 설정이 바뀐 것이다. 조용히 넘기지 않는다.
    console.warn('⚠️ 대문을 쓰는데 사이트맵에 / 가 없다 — astro.config 의 sitemap 설정을 확인할 것');
  }
}

console.log(
  skipGate
    ? `✓ 대문 건너뜀 — 언어가 ${only} 하나뿐이라 / → /${only}/ 로 보낸다${sitemapNote}`
    : `✓ 대문 사용 — 언어 ${locales.length}개(${locales.join(', ')}), / 가 대문을 보여준다`
);
