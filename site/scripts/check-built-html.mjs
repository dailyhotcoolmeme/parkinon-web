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
}

walk(DIST);

if (problems.length) {
  console.error('\n✗ 화면에 마크다운 기호가 그대로 나갑니다. HTML 태그로 바꾸세요(<strong>…</strong>):');
  for (const p of problems) console.error('  - ' + p);
  console.error('');
  process.exit(1);
}
console.log('✓ 마크다운 찌꺼기 없음');
