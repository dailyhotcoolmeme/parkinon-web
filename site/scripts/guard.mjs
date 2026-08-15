/*
 * 규칙 파수꾼(guard) — 내가 기억하지 않아도 도는 검사.
 *
 * ★왜 있나 (2026-08-15, 오너 지시: "이걸 놓치지 않게 훅으로 막든지 해라")
 *  규칙을 문장으로 적어 두면 다음 세션의 나는 그걸 읽고도 어긴다. 실제로 이 저장소에서
 *  하루에 네 번 났다.
 *    ① 일본어판 전 페이지가 모바일에서 깨짐 (word-break 언어 구분 누락)
 *    ② 강조 밑줄이 링크와 모양이 겹침
 *    ③ 용어사전 항목을 만들어 놓고 본문에서 연결을 안 함
 *    ④ 인용 박스 아래 여백이 0px (`<b>…</b>` 만으로 된 줄)
 *  ①②④는 `npm run build` 의 검사(check-viewport·check-built-html)가 이미 막는다.
 *  하지만 빌드는 **글을 다 쓰고 나서** 돈다 — 그때는 이미 여러 편에 같은 실수가 퍼져 있다.
 *
 *  이 파일은 **파일 하나를 고치는 순간** 도는 층이다. Claude Code 훅
 *  (`~/.claude/hooks/guard-post-edit.sh`)이 Edit/Write 직후에, 그리고 응답을 끝낼 때
 *  (`guard-stop.sh`)에 이걸 부른다. 훅은 내가 아니라 harness 가 실행하므로,
 *  내가 규칙을 잊어도·세션이 새로 시작돼도 계속 돈다.
 *
 * 쓰는 법
 *   node scripts/guard.mjs file <파일경로>   ← 파일 하나 검사(훅이 Edit/Write 직후 부른다)
 *   node scripts/guard.mjs changed           ← git 기준 변경된 파일 전부(훅이 응답 끝에 부른다)
 *   node scripts/guard.mjs list              ← 등록된 규칙 목록
 * 위반이 있으면 **종료코드 2**로 끝난다(훅이 이걸 보고 작업을 막는다).
 *
 * ★새 규칙을 넣는 자리도 여기다. 사고가 나면 문장으로만 적지 말고 RULES 에 한 줄 넣을 것.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { vocabulary as vocabOf, missingTerms } from './lib/glossary-terms.mjs';

const SITE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const REPO = path.resolve(SITE, '..');
const rel = (p) => path.relative(SITE, path.resolve(p)).split(path.sep).join('/');

const isArticle = (p) => /src\/content\/articles\/[a-z]{2}\/[^/]+\/[^/]+\.mdx$/.test(rel(p));
const isGlossary = (p) => rel(p).endsWith('/lifestyle/glossary.mdx');
const body = (src) => src.replace(/^---[\s\S]*?\n---\n/, '');

/* 판정 로직은 scripts/lib/glossary-terms.mjs 한 곳에만 둔다 — 빌드 게이트와 같은 기준이어야 한다. */
function vocabulary(lang) {
  const p = path.join(SITE, `src/content/articles/${lang}/lifestyle/glossary.mdx`);
  return fs.existsSync(p) ? vocabOf(fs.readFileSync(p, 'utf8')) : [];
}

const BASELINE_PATH = path.join(SITE, 'docs/glossary-term-baseline.json');
const baseline = fs.existsSync(BASELINE_PATH) ? JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) : {};

/* ── 규칙 ──────────────────────────────────────────────────────────────────── */
const RULES = [
  {
    id: 'glossary-link',
    why: '용어사전에 항목을 만들어 놓고 본문에서 연결을 안 하면, 독자는 그 설명에 닿을 방법이 없다 (2026-08-15).',
    applies: (p) => isArticle(p) && !isGlossary(p),
    check(file, src) {
      const lang = rel(file).split('/')[3];
      const known = new Set(baseline[rel(file).replace('src/content/articles/', '')] ?? []);
      return missingTerms(src, vocabulary(lang))
        .filter((t) => !known.has(t))
        .map((t) => `용어사전에 있는 "${t}" 가 맨 텍스트로 나온다 — <Term brief="…" href="/${lang}/lifestyle/glossary/#앵커">${t}</Term> 로 감쌀 것`);
    },
  },
  {
    id: 'term-needs-href',
    why: 'Term 은 툴팁만 띄우는 게 아니라 "자세히 보기"로 용어사전까지 이어져야 한다. 일본어판이 3/35 만 연결돼 있었다 (2026-08-15).',
    applies: (p) => isArticle(p),
    check(file, src) {
      return [...body(src).matchAll(/<Term\b([^>]*)>([^<]*)</g)]
        .filter((m) => !/\bhref=/.test(m[1]))
        .map((m) => `<Term> "${m[2].trim()}" 에 href 가 없다 — 용어사전 앵커로 연결할 것(앵커는 빌드 후 실제 id 를 grep 해서 확인)`);
    },
  },
  {
    id: 'component-import',
    why: '컴포넌트를 쓰면서 import 를 빠뜨리면 "Expected component `Term` to be defined" 로 빌드가 죽는다. 그 글에서 처음 Term 을 쓸 때 잊기 쉽다 (2026-08-15, 기존 글 정리하다 7편에서 냈다).',
    applies: (p) => isArticle(p),
    check(file, src) {
      const used = ['Term', 'Steps', 'Checklist', 'Callout', 'CompareBar', 'SourceQuote', 'StoryHead'];
      return used
        .filter((c) => new RegExp(`<${c}[\\s/>]`).test(body(src)) && !new RegExp(`^import ${c} from`, 'm').test(src))
        .map((c) => `<${c}> 를 쓰는데 import 가 없다 — frontmatter 뒤에 import ${c} from '../../../../components/article/${c}.astro'; 를 넣을 것`);
    },
  },
  {
    id: 'term-brief-quotes',
    why: 'brief 안에 겹따옴표가 들어가면 속성이 거기서 끊겨 툴팁이 깨진다 (2026-08-15, 「항시 치료를 요하는 중증환자」를 따옴표로 쓰다가 실제로 냈다). 인용은 「」 나 홑따옴표로 쓸 것.',
    applies: (p) => isArticle(p) || isGlossary(p),
    check(file, src) {
      return [...src.matchAll(/<Term\s+brief="(.*?)"\s+(?:href|>)/gs)]
        .filter((m) => m[1].includes('"'))
        .map((m) => `brief 안에 겹따옴표가 있다 — 「」 로 바꿀 것: ${m[1].slice(0, 40)}…`);
    },
  },
  {
    id: 'stray-inline-block',
    why: '`<b>…</b>` 만으로 된 줄은 문단(<p>)으로 안 감싸져 위 여백이 0 이 된다 — 앞 박스에 달라붙는다 (2026-08-15 오너가 스크린샷으로 발견).',
    applies: (p) => isArticle(p),
    check(file, src) {
      /*
       * ⚠️ 앞 줄에 이어지는 경우는 문제가 없다 — remark 가 그 줄까지 같은 문단으로 묶어서
       * <p> 안에 넣는다. 사고가 나는 건 **앞뒤가 빈 줄이라 혼자 떨어져 있는 블록**일 때뿐이다.
       * (처음엔 줄 모양만 보고 걸렀다가 멀쩡한 줄을 잡았다 — 2026-08-15)
       */
      const fm = src.match(/^---[\s\S]*?\n---\n/);
      const offset = fm ? fm[0].split('\n').length - 1 : 0;
      const lines = body(src).split('\n');
      const out = [];
      lines.forEach((line, i) => {
        if (!/^<(b|strong|em|i|span|code)\b[^>]*>.*<\/\1>\s*$/.test(line.trim())) return;
        const prevBlank = i === 0 || lines[i - 1].trim() === '';
        const nextBlank = i === lines.length - 1 || lines[i + 1].trim() === '';
        if (!prevBlank || !nextBlank) return;
        out.push(`${i + 1 + offset}행: 줄 전체가 인라인 태그 하나로 혼자 떨어져 있다 — 앞뒤에 보통 글자를 두거나 <p> 로 감쌀 것`);
      });
      return out;
    },
  },
  {
    id: 'raw-table-wrap',
    why: '표를 직접 HTML 로 쓰면 rehypeTableScroll 이 못 감싼다 → 넓은 표가 문서 폭을 늘려 좁은 화면에서 페이지가 찌그러진다 (2026-08-15, 한국어 제도 글 4편에서 발견).',
    applies: (p) => isArticle(p) || isGlossary(p),
    check(file, src) {
      const b = body(src);
      const out = [];
      for (const m of b.matchAll(/<table[\s>]/g)) {
        const before = b.slice(Math.max(0, m.index - 200), m.index);
        if (!/<div class="table-scroll">\s*$/.test(before.trimEnd() + '\n')) {
          if (!/table-scroll/.test(before)) {
            out.push('직접 쓴 <table> 이 <div class="table-scroll"> 로 감싸져 있지 않다 — 마크다운 표로 쓰거나 직접 감쌀 것');
          }
        }
      }
      return out;
    },
  },
];

/* ── 실행 ──────────────────────────────────────────────────────────────────── */
function checkFile(file) {
  if (!fs.existsSync(file)) return [];
  const src = fs.readFileSync(file, 'utf8');
  const out = [];
  for (const rule of RULES) {
    if (!rule.applies(file)) continue;
    for (const msg of rule.check(file, src)) out.push(`${rel(file)}  [${rule.id}] ${msg}`);
  }
  return out;
}

function changedFiles() {
  const run = (cmd) => {
    try {
      return execSync(cmd, { cwd: REPO, encoding: 'utf8' }).split('\n').filter(Boolean);
    } catch {
      return [];
    }
  };
  return [...new Set([...run('git diff --name-only HEAD'), ...run('git ls-files --others --exclude-standard')])]
    .map((p) => path.join(REPO, p))
    .filter((p) => p.endsWith('.mdx'));
}

const [mode, target] = process.argv.slice(2);
let problems = [];

if (mode === 'list') {
  for (const r of RULES) console.log(`- ${r.id}\n    ${r.why}`);
  process.exit(0);
} else if (mode === 'file') {
  problems = checkFile(path.resolve(target));
} else if (mode === 'changed') {
  for (const f of changedFiles()) problems.push(...checkFile(f));
} else {
  console.error('쓰는 법: node scripts/guard.mjs file <경로> | changed | list');
  process.exit(1);
}

if (problems.length) {
  console.error('✗ parkinon-web 규칙 위반');
  for (const p of problems) console.error('  - ' + p);
  process.exit(2);
}
