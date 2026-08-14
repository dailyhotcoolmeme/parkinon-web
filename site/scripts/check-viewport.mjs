/*
 * 여러 화면 크기에서 실제로 렌더링해서 검수하는 스크립트. `npm run build`가 만든
 * dist/ 를 대상으로 한다 — 정적 HTML을 grep하는 것만으로는 못 잡는 버그가 있다
 * (2026-08-08: 검색 필터 날짜칸이 모바일에서 아이콘만 남게 눌리거나, 톱바 검색
 * 버튼이 CSS 충돌로 초록 사각형이 되는 것 — 둘 다 렌더링해서 재야만 보인다).
 *
 * 확인하는 것:
 *   1) 가로 스크롤이 생기는가 (요소가 화면 폭을 넘어감)
 *   2) input/select 가 내용을 담기에 너무 좁게 눌렸는가(아이콘만 남는 등)
 *   3) 본문 블록 요소(인용·표·강조박스·절차카드…)의 위·아래 여백이 같은가
 *      (2026-08-14: 아래 여백을 옆 요소가 정하고 있어서 같은 박스인데 아래가 제각각이었다)
 *   4) 화면마다 스크린샷을 docs/ui-screenshots/ 에 저장 — 배포마다 최신 상태를
 *      실제로 눈으로 볼 수 있게 남긴다(오너 지시 2026-08-08: "고치고나서 실제
 *      화면을 찍어서 보라고! 브라우저 크기별로 모두다 검수하라고").
 *
 * 하나라도 걸리면 배포를 막는다(exit 1). 새 페이지에 이 검사를 추가하려면
 * PAGES 배열에 경로와, 그 페이지에서 확인할 상태 전환(states)을 추가할 것.
 */
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SHOT_DIR = path.join(ROOT, 'docs/ui-screenshots');
const PORT = 5799;

const WIDTHS = [360, 390, 430, 768, 1024, 1440];
const HEIGHT = 900;

/* 페이지마다: 기본 상태 + 클릭 등으로 만들 추가 상태. 각 상태에서 오버플로/좁음
   검사와 스크린샷을 둘 다 한다. */
const PAGES = [
  {
    slug: 'clinical',
    path: '/ko/clinical/',
    states: [
      { name: 'default', run: async () => {} },
      {
        name: 'search-expanded',
        run: async (page) => {
          await page.click('#searchQuery');
        },
      },
      {
        name: 'research-filters',
        run: async (page) => {
          await page.click('#searchQuery');
          await page.click('#feedTabs .pill[data-feed=research]');
        },
      },
    ],
  },
  /*
   * ⚠️ 2026-08-14 — 여기에 한국어 임상 페이지 한 장만 들어 있어서, **일본어판 전 페이지가
   * 모바일에서 깨져 있는 것을 이 검사가 통과시켰다**(오너 지적: "일본어 모바일에서 모든
   * 페이지가 다 이상하다"). 원인은 `word-break: keep-all` 이었다 — 한국어는 띄어쓰기에서
   * 줄이 바뀌지만 일본어는 띄어쓰기가 없어 문장 전체가 끊을 수 없는 한 덩어리가 되고,
   * 그 길이가 그대로 문서 폭이 되어(360px 화면에서 804~1030px) 페이지가 반쪽으로
   * 찌그러졌다. 이 종류의 사고는 **언어 단위로 한꺼번에** 터지므로, 언어마다 대표 화면을
   * 넣어 둔다. 글이 늘어난다고 여기 목록을 늘릴 필요는 없다 — 원인이 언어·공통 CSS라
   * 대표 한 장이면 잡힌다.
   */
  { slug: 'ja-home', path: '/ja/', states: [{ name: 'default', run: async () => {} }] },
  { slug: 'ja-institutions', path: '/ja/institutions/', states: [{ name: 'default', run: async () => {} }] },
  {
    // 넓은 숫자 표(5열)가 있는 글 — 표가 문서 폭을 늘리지 않는지 본다
    slug: 'ja-article',
    path: '/ja/institutions/kougaku-ryouyouhi/',
    states: [{ name: 'default', run: async () => {} }],
  },
  { slug: 'en-article', path: '/en/institutions/us-ssdi-disability-benefits/', states: [{ name: 'default', run: async () => {} }] },
  { slug: 'ko-home', path: '/ko/', states: [{ name: 'default', run: async () => {} }] },
];

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };

function startServer() {
  const server = createServer(async (req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const full = path.join(DIST, p);
    if (!full.startsWith(DIST) || !existsSync(full)) {
      res.writeHead(404).end('not found');
      return;
    }
    const ext = path.extname(full);
    res.writeHead(200, { 'content-type': MIME[ext] ?? 'application/octet-stream' });
    res.end(await readFile(full));
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

async function main() {
  if (!existsSync(DIST)) {
    console.error('✗ dist/ 가 없다 — astro build 먼저 돌 것');
    process.exit(1);
  }
  await mkdir(SHOT_DIR, { recursive: true });

  const server = await startServer();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const issues = [];

  try {
    for (const { slug, path: pagePath, states } of PAGES) {
      for (const width of WIDTHS) {
        const ctx = await browser.newContext({ viewport: { width, height: HEIGHT } });
        const page = await ctx.newPage();
        await page.goto(`http://localhost:${PORT}${pagePath}`, { waitUntil: 'load', timeout: 30000 });

        for (const state of states) {
          try {
            await state.run(page);
          } catch (e) {
            issues.push(`${slug}@${width}px [${state.name}] 상태 전환 실패: ${e.message}`);
            continue;
          }
          await page.waitForTimeout(150);

          const overflow = await page.evaluate(() => {
            const w = window.innerWidth;
            return document.documentElement.scrollWidth > w + 2 ? document.documentElement.scrollWidth : null;
          });
          if (overflow) {
            issues.push(`${slug}@${width}px [${state.name}] 가로 스크롤 발생 — scrollWidth ${overflow}px > 화면 ${width}px`);
          }

          /*
           * 본문 블록 요소의 **위·아래 여백이 같은지** 본다.
           *
           * 예전에는 모든 요소가 margin-top 만 갖고 있어서, 어떤 요소의 아래 간격을 "다음에
           * 오는 것"이 정했다 — 같은 회색 인용 박스인데 아래가 문단이면 14px, 표면 18px,
           * 제목이면 44px 로 제각각이었다(2026-08-14 오너 지적). 요소가 스스로 위·아래를
           * 같이 들고 있어야 옆에 무엇이 오든 간격이 유지된다.
           * 제목(h2·h3)은 일부러 비대칭이므로 대상에서 뺀다 — 위가 넓어야 절이 나뉘어 보인다.
           * 규칙: memory `feedback_symmetric_spacing_standalone_line`
           */
          const asym = await page.evaluate(() => {
            const SEL = [
              'blockquote',
              '.callout',
              '.table-scroll',
              '.steps',
              '.check',
              'figure.chart',
              'figure.photo',
              'ul',
              'ol',
            ];
            const bad = [];
            const body = document.querySelector('.article-body');
            if (!body) return bad;
            for (const sel of SEL) {
              const el = body.querySelector(':scope > ' + sel);
              if (!el) continue;
              const s = getComputedStyle(el);
              const top = parseFloat(s.marginTop);
              const bottom = parseFloat(s.marginBottom);
              if (Math.abs(top - bottom) > 0.5) {
                bad.push(`${sel} 위 ${Math.round(top)}px ≠ 아래 ${Math.round(bottom)}px`);
              }
            }
            return bad;
          });
          if (asym.length) {
            issues.push(`${slug}@${width}px [${state.name}] 본문 여백이 위아래 비대칭: ${asym.join(', ')}`);
          }

          const narrow = await page.evaluate(() => {
            const bad = [];
            document.querySelectorAll('input, select').forEach((el) => {
              const r = el.getBoundingClientRect();
              const style = getComputedStyle(el);
              if (style.display === 'none' || style.visibility === 'hidden') return;
              /* 체크박스·라디오는 원래 20px짜리 정사각형이다 — 여기서 보려는 건
                 "글자가 들어가야 하는 칸이 눌렸는가"이므로 뺀다(글 본문 체크리스트). */
              if (el.type === 'checkbox' || el.type === 'radio') return;
              if (r.width > 0 && r.width < 24) {
                bad.push(`${el.tagName.toLowerCase()}#${el.id || '(no id)'} width=${Math.round(r.width)}px`);
              }
            });
            return bad;
          });
          if (narrow.length) {
            issues.push(`${slug}@${width}px [${state.name}] 입력 요소가 너무 좁게 눌림: ${narrow.join(', ')}`);
          }

          await page.screenshot({ path: path.join(SHOT_DIR, `${slug}-${width}-${state.name}.png`) });
        }
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (issues.length) {
    console.error('\n✗ 화면 검사 실패');
    for (const issue of issues) console.error(`  ${issue}`);
    console.error(`\n스크린샷: ${path.relative(ROOT, SHOT_DIR)}/ 에서 직접 확인할 것\n`);
    process.exit(1);
  }
  console.log(`✓ 화면 검사 통과 (${PAGES.length}개 페이지 × ${WIDTHS.length}개 크기)`);
  console.log(`  스크린샷: ${path.relative(ROOT, SHOT_DIR)}/`);
}

main();
