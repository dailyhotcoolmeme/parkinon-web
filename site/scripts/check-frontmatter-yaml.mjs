/*
 * 프론트매터가 YAML 로 안전하게 읽히는지 검사한다.
 *
 * ★ 왜 있나 (2026-09-02): `: `(콜론+공백)가 따옴표 없는 값 안에 들어가면 YAML 이 그 줄을
 *   문자열이 아니라 **매핑**으로 읽어 버려서 빌드가 깨진다. 스페인어·포르투갈어처럼
 *   문장 부호 습관이 다른 언어를 추가하면 자주 밟는다.
 *
 * ★ 왜 다시 만들었나 (2026-09-02, 같은 날 두 번째): 처음 판은 `summary:`·`hashtags:` 의
 *   **목록 항목만** 검사했다. 그래서 `description:` 같은 스칼라 필드의 콜론을 못 잡았고,
 *   칠레 글 두 편에서 그대로 빌드가 깨졌다 — 검사기가 있는데도 빌드를 돌려야 알았다.
 *   이제는 **프론트매터 전체를 실제로 YAML 로 파싱**한다. 어느 형태의 오류든 다 걸린다.
 *
 * 고치는 법: 그 줄의 값을 작은따옴표로 감싼다. 안에 작은따옴표가 있으면 '' 로 두 번 쓴다.
 *   description: '앞부분: 뒷부분'
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';

const ARTICLES = path.resolve(import.meta.dirname, '../src/content/articles');

/** 스키마상 문자열이어야 하는 필드 — 여기에 객체가 오면 콜론 사고다. */
const MUST_BE_STRING = ['title', 'description', 'tag', 'basisDate', 'heroAlt'];
/** 스키마상 문자열 목록이어야 하는 필드. */
const MUST_BE_STRING_LIST = ['summary', 'hashtags'];

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
  const raw = await readFile(file, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) {
    problems.push({ rel, why: '프론트매터(--- 로 감싼 머리말)가 없다' });
    continue;
  }

  let data;
  try {
    data = yaml.load(m[1]);
  } catch (e) {
    const where = e.mark ? ` (${e.mark.line + 2}번째 줄 근처)` : '';
    problems.push({ rel, why: `YAML 을 읽을 수 없다${where} — ${e.reason ?? e.message}` });
    continue;
  }

  if (data === null || typeof data !== 'object') {
    problems.push({ rel, why: '프론트매터가 비어 있거나 객체가 아니다' });
    continue;
  }

  for (const k of MUST_BE_STRING) {
    if (!(k in data)) continue;
    if (typeof data[k] !== 'string') {
      problems.push({ rel, why: `\`${k}\` 가 문자열이 아니다 — 값 안의 ": " 때문에 매핑으로 읽혔다` });
    }
  }
  for (const k of MUST_BE_STRING_LIST) {
    if (!(k in data)) continue;
    const v = data[k];
    if (!Array.isArray(v)) {
      problems.push({ rel, why: `\`${k}\` 가 목록이 아니다` });
      continue;
    }
    v.forEach((item, i) => {
      if (typeof item !== 'string') {
        problems.push({ rel, why: `\`${k}\` 의 ${i + 1}번째 항목이 문자열이 아니다 — 값 안의 ": " 때문이다` });
      }
    });
  }
}

if (problems.length) {
  console.error('\n✗ 프론트매터 YAML 검사 실패\n');
  for (const p of problems) {
    console.error(`  ${p.rel}`);
    console.error(`    ${p.why}`);
  }
  console.error('\n  고치는 법: 그 줄의 값을 작은따옴표로 감쌀 것 — `description: \'앞: 뒤\'`');
  console.error("  값 안에 작은따옴표가 있으면 '' 로 두 번 쓴다.\n");
  process.exit(1);
}

console.log('✓ 프론트매터 YAML 검사 통과');
