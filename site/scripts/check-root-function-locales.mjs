/*
 * 루트(`/`) Pages Function 의 지원 언어 목록이 **실제 콘텐츠와 맞는지** 검사한다.
 *
 * ★ 왜 있나 (2026-09-02): Function 은 정적 배포물 밖에서 돌기 때문에 콘텐츠 컬렉션을
 *   읽지 못한다. 그래서 지원 언어를 손으로 적어야 하는데, 손으로 적는 목록은 반드시
 *   어긋난다. 실제로 포르투갈어 골격만 배포한 상태에서 Function 이 pt 를 지원 언어로
 *   들고 있어서, 브라질 방문자가 글 0편인 빈 사이트로 넘어갔다.
 *
 * 규칙: Function 의 SUPPORTED 는 **글이 한 편이라도 있는 언어 집합과 정확히 같아야 한다.**
 *   - 글이 있는데 빠져 있으면 → 그 언어권 방문자가 영어로 새어 나간다
 *   - 글이 없는데 들어 있으면 → 그 언어권 방문자가 빈 사이트로 간다
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const SITE = path.resolve(import.meta.dirname, '..');
const ROOT = path.resolve(SITE, '..');
const ARTICLES = path.join(SITE, 'src/content/articles');

/** 초안이 아닌 글이 한 편이라도 있는 언어. */
async function localesWithContent() {
  const out = new Set();
  for (const loc of await readdir(ARTICLES, { withFileTypes: true })) {
    if (!loc.isDirectory()) continue;
    const stack = [path.join(ARTICLES, loc.name)];
    while (stack.length) {
      for (const e of await readdir(stack.pop(), { withFileTypes: true })) {
        const p = path.join(e.parentPath ?? e.path, e.name);
        if (e.isDirectory()) stack.push(p);
        else if (e.name.endsWith('.mdx')) {
          const s = await readFile(p, 'utf8');
          if (!/^draft:\s*true\s*$/m.test(s)) { out.add(loc.name); stack.length = 0; break; }
        }
      }
    }
  }
  return out;
}

const src = await readFile(path.join(ROOT, 'functions/index.ts'), 'utf8');
const m = src.match(/const SUPPORTED = \[([^\]]*)\]/);
if (!m) {
  console.error('✗ functions/index.ts 에서 SUPPORTED 를 찾지 못했다');
  process.exit(1);
}
const supported = new Set([...m[1].matchAll(/'([a-z]{2})'/g)].map((x) => x[1]));
const content = await localesWithContent();

const missing = [...content].filter((l) => !supported.has(l)).sort();
const extra = [...supported].filter((l) => !content.has(l)).sort();

if (missing.length || extra.length) {
  console.error('\n✗ 루트 Function 지원 언어가 콘텐츠와 어긋난다\n');
  if (missing.length) {
    console.error(`  글은 있는데 Function 에 없다: ${missing.join(', ')}`);
    console.error('    → 그 언어권 방문자가 영어로 새어 나간다. functions/index.ts 의');
    console.error('      SUPPORTED 와 COUNTRY_TO_LANG 에 추가할 것.');
  }
  if (extra.length) {
    console.error(`  Function 에는 있는데 글이 없다: ${extra.join(', ')}`);
    console.error('    → 그 언어권 방문자가 빈 사이트로 간다. 콘텐츠를 넣거나 목록에서 뺄 것.');
  }
  console.error('');
  process.exit(1);
}

console.log(`✓ 루트 Function 언어 검사 통과 — ${[...content].sort().join(', ')}`);
