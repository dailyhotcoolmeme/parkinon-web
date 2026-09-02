/*
 * 각 언어의 「웹사이트 개인정보처리방침」 페이지가 가리키는 **앱 개인정보처리방침**이
 * 그 언어로 실제로 존재하는지 검사한다.
 *
 * ★ 왜 있나 (2026-09-02)
 * 스페인어 페이지가 「aquí」로 **영어 문서**를 가리키고 있었다 — 스페인어를 읽는 사람에게
 * 법률 문서를 영어로 내놓고 있었던 것이다. 앱 방침은 Astro 밖(저장소 루트 `public/privacy/`)
 * 에 있는 손으로 쓴 정적 HTML 이라 아무 검사도 안 걸려 있었다. 언어를 새로 열 때 이 문서를
 * 같이 만들지 않으면 조용히 다른 언어로 새어 나간다.
 *
 * 규칙: `/xx/privacy/` 페이지의 링크는 **자기 언어 문서**를 가리켜야 하고, 그 파일이 있어야 한다.
 *   한국어만 예외 — 앱 방침의 정본이 `/privacy`(접두사 없음)다.
 */
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '../..');
const PAGES = path.join(REPO, 'site/src/pages');
const DOCS = path.join(REPO, 'public/privacy');

const locales = (await readdir(PAGES, { withFileTypes: true }))
  .filter((e) => e.isDirectory() && /^[a-z]{2}$/.test(e.name))
  .map((e) => e.name)
  .sort();

const problems = [];
for (const loc of locales) {
  const file = path.join(PAGES, loc, 'privacy.astro');
  if (!existsSync(file)) continue;
  const src = await readFile(file, 'utf8');
  const links = [...src.matchAll(/href="(\/privacy(?:\/[a-z]{2})?)"/g)].map((m) => m[1]);
  if (links.length === 0) {
    problems.push(`  ${loc}: 앱 개인정보처리방침 링크가 아예 없다`);
    continue;
  }
  const want = loc === 'ko' ? '/privacy' : `/privacy/${loc}`;
  for (const got of links) {
    if (got !== want) problems.push(`  ${loc}: "${got}" 을 가리킨다 — "${want}" 여야 한다(다른 언어 문서를 내놓고 있다)`);
  }
  const doc = loc === 'ko' ? path.join(DOCS, 'index.html') : path.join(DOCS, loc, 'index.html');
  if (!existsSync(doc)) {
    problems.push(`  ${loc}: ${path.relative(REPO, doc)} 가 없다 — 그 언어의 앱 방침 문서를 만들어야 한다`);
  }
}

if (problems.length) {
  console.error('\n✗ 앱 개인정보처리방침 링크 검사 실패\n');
  problems.forEach((p) => console.error(p));
  console.error('\n  앱 방침은 Astro 가 아니라 저장소 루트 public/privacy/<언어>/index.html 에 있다.');
  console.error('  영어판(public/privacy/en/index.html)을 그대로 옮겨 쓰되 조문 구조를 바꾸지 말 것.\n');
  process.exit(1);
}
console.log(`✓ 앱 개인정보처리방침 링크 검사 통과 — ${locales.length}개 언어`);
