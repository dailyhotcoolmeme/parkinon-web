/*
 * 용어사전에 항목이 있는 말이, 글 본문에 **맨 텍스트로** 나오고 있지 않은지 검사한다.
 *
 * 왜 필요한가 (2026-08-15 오너 지적):
 * 자립지원의료 글을 쓰면서 용어사전 항목을 3개 새로 만들어 놓고, 정작 본문에서는 1개만
 * <Term>으로 걸었다. 용어사전에 설명을 써 두고 본문에서 연결을 안 하면 독자는 그 설명에
 * 닿을 방법이 없다. 기존 검사(check-built-html·check-viewport)는 "Term에 링크가 붙어
 * 있는가"만 봐서 이걸 못 잡았다 — **"달아야 할 곳에 Term이 없다"** 는 반대 방향이다.
 *
 * ⚠️ 기존 글 50편에 80건이 이미 쌓여 있다(2026-08-15 전수조사). 그걸 한 번에 다 고치는
 * 것과 새 글에서 또 빠뜨리는 것을 막는 것은 별개다. 그래서 **기준선(baseline)** 방식으로
 * 간다 — 지금 있는 것은 `docs/glossary-term-baseline.json` 에 적어 두고, **거기 없는 새
 * 누락이 생기면 빌드를 실패**시킨다. 기존 것을 고치면 기준선에서 지운다(줄어들기만 한다).
 *
 * 오탐을 줄이려고 일부러 느슨하게 잡는다:
 *  - 용어가 그 글에서 이미 한 번이라도 <Term> 으로 감싸졌거나 용어사전으로 링크됐으면 통과
 *  - 4글자 미만의 짧은 말은 검사하지 않는다(다른 문맥에 흔히 섞인다)
 *  - frontmatter(제목·요약·출처)는 보지 않는다 — 거기엔 컴포넌트를 못 쓴다
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';

const LANGS = ['ko', 'en', 'ja'];
const BASELINE = 'docs/glossary-term-baseline.json';
const MIN_LEN = 4;

/* 용어사전에서 "용어 이름" 목록을 뽑는다. ### 는 그대로, ## 는 「…とは何ですか」류 꼬리를 뗀다.
   「○○でよく出てくる言葉」 같은 묶음 제목은 용어가 아니므로 뺀다. */
function vocabulary(lang) {
  const path = `src/content/articles/${lang}/lifestyle/glossary.mdx`;
  if (!existsSync(path)) return [];
  const out = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const h3 = line.match(/^### (.+)$/);
    if (h3) {
      out.push(h3[1].trim());
      continue;
    }
    const h2 = line.match(/^## (.+)$/);
    if (!h2) continue;
    const title = h2[1].trim();
    if (/(よく出てくる言葉|窓口の名前|words that come up|나오는 말)/i.test(title)) continue;
    out.push(
      title
        .replace(/(とは何ですか|はどう違いますか|とは)\s*$/, '')
        .replace(/(가 뭔가요|이 뭔가요|은 뭔가요|는 뭔가요|은 어떻게 다른가요|는 어떻게 다른가요)\s*$/, '')
        .replace(/^(What is|What are|What do)\s+/i, '')
        .trim()
    );
  }
  return [...new Set(out)].filter((t) => t.length >= MIN_LEN);
}

function findMisses() {
  const misses = {};
  for (const lang of LANGS) {
    const vocab = vocabulary(lang);
    for (const category of ['institutions', 'lifestyle', 'news']) {
      const dir = `src/content/articles/${lang}/${category}`;
      if (!existsSync(dir)) continue;
      for (const file of readdirSync(dir)) {
        if (file === 'glossary.mdx' || !file.endsWith('.mdx')) continue;
        const key = `${lang}/${category}/${file}`;
        const source = readFileSync(`${dir}/${file}`, 'utf8');
        const body = source.replace(/^---[\s\S]*?\n---\n/, '');

        const wrapped = new Set([...body.matchAll(/<Term[^>]*>([^<]*)<\/Term>/g)].map((m) => m[1].trim()));
        const linked = new Set(
          [...body.matchAll(/href="\/[a-z]{2}\/lifestyle\/glossary\/#([^"]+)"/g)].map((m) => decodeURIComponent(m[1]))
        );
        const plain = body.replace(/<Term[\s\S]*?<\/Term>/g, '');

        const found = vocab.filter((t) => plain.includes(t) && !wrapped.has(t) && !linked.has(t));
        if (found.length) misses[key] = found.sort();
      }
    }
  }
  return misses;
}

const current = findMisses();
const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : null;

/* `--update-baseline` 로 지금 상태를 기준선으로 굳힌다(처음 도입할 때만). */
if (process.argv.includes('--update-baseline')) {
  writeFileSync(BASELINE, JSON.stringify(current, null, 2) + '\n');
  const count = Object.values(current).reduce((n, v) => n + v.length, 0);
  console.log(`기준선을 갱신했다 — ${Object.keys(current).length}편 ${count}건`);
  process.exit(0);
}

if (!baseline) {
  console.error(`✗ ${BASELINE} 이 없다 — 처음이라면 \`node scripts/check-glossary-terms.mjs --update-baseline\` 로 만들 것`);
  process.exit(1);
}

const added = [];
for (const [file, terms] of Object.entries(current)) {
  const known = new Set(baseline[file] ?? []);
  for (const t of terms) if (!known.has(t)) added.push(`${file}: ${t}`);
}

if (added.length) {
  console.error('\n✗ 용어사전에 항목이 있는 말이 본문에 맨 텍스트로 나옵니다 — <Term> 으로 감싸고 용어사전으로 연결하세요.');
  console.error('  (그 자리에서 완전한 정의를 이미 준 경우처럼 정말 달 필요가 없다면,');
  console.error('   `node scripts/check-glossary-terms.mjs --update-baseline` 로 기준선에 넣을 것)');
  for (const a of added) console.error('  - ' + a);
  console.error('');
  process.exit(1);
}

const fixed =
  Object.values(baseline).reduce((n, v) => n + v.length, 0) - Object.values(current).reduce((n, v) => n + v.length, 0);
const remaining = Object.values(current).reduce((n, v) => n + v.length, 0);
console.log(
  `✓ 용어사전 연결 검사 통과 — 새 누락 없음` + (remaining ? ` (기존 미연결 ${remaining}건 남음${fixed > 0 ? `, 이번에 ${fixed}건 줄임` : ''})` : '')
);
