/*
 * 빌드 산출물에 **마크다운 찌꺼기**가 남았는지 검사한다. 남아 있으면 빌드를 실패시킨다.
 *
 * 왜 필요한가: CommonMark 는 닫는 `**` 앞이 구두점(%, ), . 등)이고 바로 뒤가 한글이면
 * 강조로 인식하지 않는다. `**10%**만` 처럼 조사가 붙는 한국어에서 자주 걸린다.
 * 실제로 이렇게 별표가 화면에 그대로 나간 적이 있다(오너 발견, 2026-08-06).
 * 그런 경우엔 마크다운 대신 <strong>10%</strong> 처럼 HTML 로 쓴다.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const problems = [];
const strays = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (name.endsWith('.html')) check(path);
  }
}

function check(path) {
  const html = readFileSync(path, 'utf8');
  // <body> 안만 본다(스크립트·스타일 제외)
  const body = html.slice(html.indexOf('<body'), html.lastIndexOf('</body>'));
  const text = body.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  for (const pattern of [/\*\*[^*\n]{1,40}\*\*/g, /(^|\s)_[^_\n]{1,40}_(\s|$)/g]) {
    for (const m of text.matchAll(pattern)) {
      problems.push(`${path}: ${m[0].trim().slice(0, 60)}`);
    }
  }
  checkStrayInline(path, body);
}

/*
 * 본문(.article-body) **바로 밑에 인라인 요소가 그대로 놓였는지** 검사한다.
 *
 * 왜 필요한가: MDX 에서 한 줄이 `<b>…</b>` 하나로만 이뤄지면, remark 가 그 줄을 문단으로
 * 감싸지 않고 **날것 HTML 블록**으로 내보낸다. 본문 여백은 전부 <p> 에 걸려 있으므로,
 * 그 줄만 **위 여백이 0** 이 되어 앞 요소(회색 인용 박스 등)에 딱 달라붙는다
 * (2026-08-14 오너가 스크린샷으로 발견 — 180편 중 1건이었다).
 *
 * 고치는 법: 그 줄 앞뒤에 보통 글자를 한 자라도 두거나(`そして<b>…</b>`), <p> 로 감싼다.
 */
function checkStrayInline(path, body) {
  const start = body.indexOf('class="article-body');
  if (start === -1) return;
  const open = body.indexOf('>', start) + 1;

  let depth = 0;
  const tag = /<(\/?)([a-zA-Z][\w-]*)([^>]*)>/g;
  tag.lastIndex = open;
  const VOID = new Set(['br', 'img', 'hr', 'input', 'meta', 'source', 'wbr', 'col', 'area']);
  const INLINE = new Set(['b', 'strong', 'em', 'i', 'span', 'a', 'code', 'small', 'sub', 'sup']);

  let m;
  while ((m = tag.exec(body))) {
    const [, close, rawName, attrs] = m;
    const name = rawName.toLowerCase();
    if (VOID.has(name) || attrs.trim().endsWith('/')) continue;
    if (close) {
      depth -= 1;
      if (depth < 0) break; // .article-body 를 닫았다
      continue;
    }
    /*
     * 감싸지지 않은 표도 여기서 잡는다. MDX 안에 표를 **직접 HTML(`<table>`)로** 쓰면
     * astro.config.mjs 의 rehypeTableScroll 이 못 감싼다(raw HTML 은 element 노드가
     * 아니라 그대로 지나간다). 감싸지지 않으면 ① 넓은 표가 문서 폭을 늘려 좁은 화면에서
     * 페이지가 찌그러지고 ② 위·아래 여백이 어긋난다(2026-08-14 한국어 제도 글 4편에서 발견).
     * 고치는 법: 마크다운 표로 쓰거나, <div class="table-scroll"> 로 직접 감쌀 것.
     */
    if (depth === 0 && name === 'table') {
      strays.push(`${path}: <table> 가 .table-scroll 로 감싸져 있지 않습니다`);
    }
    if (depth === 0 && INLINE.has(name)) {
      const text = body.slice(m.index, m.index + 120).replace(/<[^>]*>/g, '').trim();
      strays.push(`${path}: <${name}> ${text.slice(0, 50)}`);
    }
    depth += 1;
  }
}

walk(DIST);

if (problems.length) {
  console.error('\n✗ 화면에 마크다운 기호가 그대로 나갑니다. HTML 태그로 바꾸세요(<strong>…</strong>):');
  for (const p of problems) console.error('  - ' + p);
  console.error('');
  process.exit(1);
}
if (strays.length) {
  console.error('\n✗ 본문 구조 문제 — 여백이 어긋나거나 좁은 화면에서 페이지가 밀립니다.');
  console.error('  · 인라인 요소가 떠 있는 경우: 그 줄 앞뒤에 보통 글자를 두거나(예: 그리고<b>…</b>) <p> 로 감쌀 것');
  console.error('  · 표가 감싸지지 않은 경우: 마크다운 표로 쓰거나 <div class="table-scroll"> 로 감쌀 것');
  for (const s of strays) console.error('  - ' + s);
  console.error('');
  process.exit(1);
}
console.log('✓ 마크다운 찌꺼기 없음 · 본문에 떠 있는 인라인 요소 없음');
