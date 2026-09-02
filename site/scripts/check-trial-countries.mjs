/*
 * 임상시험 국가 목록이 **두 곳에서 같은지** 검사한다.
 *
 * ★ 왜 있나 (2026-09-02)
 * 임상시험 화면은 두 군데가 각자 국가를 안다.
 *   1) `src/lib/clinicalTrials.ts` TRIAL_COUNTRIES — 빌드 타임. 화면에 처음 구워지는 30건.
 *   2) `functions/api/trials.js` COUNTRY_API_NAME — 방문 중. 검색과 "더 보기".
 * 스페인·중남미 7개국을 1)에만 넣었더니 2)에서 코드를 못 찾아 `?? null` 로 떨어졌고,
 * **국가 필터가 통째로 사라져 전 세계 시험이 「México」 패널에 붙었다.** 화면은 멀쩡해
 * 보이고 카드 내용만 틀리는 종류라 눈으로는 못 잡는다.
 *
 * 코드(`mx`)와 API 이름(`Mexico`)이 둘 다 같아야 통과한다.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const libSrc = await readFile(path.join(ROOT, 'src/lib/clinicalTrials.ts'), 'utf8');
const fnSrc = await readFile(path.join(ROOT, 'functions/api/trials.js'), 'utf8');

/** `{ code: 'mx', apiName: 'Mexico', … }` 들을 뽑는다. */
const lib = new Map(
  [...libSrc.matchAll(/\{\s*code:\s*'([a-z]{2})'\s*,\s*apiName:\s*'([^']+)'/g)].map((m) => [m[1], m[2]]),
);

/** Function 쪽 `const COUNTRY_API_NAME = { … };` 블록 안의 `mx: 'Mexico',` 들만 뽑는다. */
const block = fnSrc.match(/const COUNTRY_API_NAME = \{([\s\S]*?)\};/);
if (!block) {
  console.error("✗ functions/api/trials.js 에서 COUNTRY_API_NAME 을 못 찾았다 — 이름이 바뀌었으면 이 검사도 같이 고칠 것");
  process.exit(1);
}
const fn = new Map([...block[1].matchAll(/^\s*([a-z]{2}):\s*'([^']+)'/gm)].map((m) => [m[1], m[2]]));

const problems = [];
for (const [code, name] of lib) {
  if (!fn.has(code)) problems.push(`  "${code}" (${name}) — 빌드 쪽에만 있다. 검색·더보기에서 국가 필터가 무시된다`);
  else if (fn.get(code) !== name) problems.push(`  "${code}" — 이름이 다르다: 빌드 "${name}" ↔ Function "${fn.get(code)}"`);
}
for (const [code, name] of fn) {
  if (!lib.has(code)) problems.push(`  "${code}" (${name}) — Function 쪽에만 있다. 화면에 탭이 없는 나라다`);
}

if (problems.length) {
  console.error('\n✗ 임상시험 국가 목록 불일치\n');
  problems.forEach((p) => console.error(p));
  console.error(
    '\n  고치는 방법: src/lib/clinicalTrials.ts 의 TRIAL_COUNTRIES 와\n' +
      '  functions/api/trials.js 의 COUNTRY_API_NAME 을 **같은 코드·같은 이름**으로 맞춘다.\n',
  );
  process.exit(1);
}

console.log(`✓ 임상시험 국가 목록 일치 — ${lib.size}개국 (${[...lib.keys()].join(', ')})`);
