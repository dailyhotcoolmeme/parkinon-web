/*
 * 여러 화면 크기에서 실제로 렌더링해서 검수하는 스크립트. `npm run build`가 만든
 * dist/ 를 대상으로 한다 — 정적 HTML을 grep하는 것만으로는 못 잡는 버그가 있다
 * (2026-08-08: 검색 필터 날짜칸이 모바일에서 아이콘만 남게 눌리거나, 톱바 검색
 * 버튼이 CSS 충돌로 초록 사각형이 되는 것 — 둘 다 렌더링해서 재야만 보인다).
 *
 * 확인하는 것:
 *   1) 가로 스크롤이 생기는가 (요소가 화면 폭을 넘어감)
 *   2) input/select 가 내용을 담기에 너무 좁게 눌렸는가(아이콘만 남는 등)
 *   3) 화면마다 스크린샷을 docs/ui-screenshots/ 에 저장 — 배포마다 최신 상태를
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

          const narrow = await page.evaluate(() => {
            const bad = [];
            document.querySelectorAll('input, select').forEach((el) => {
              const r = el.getBoundingClientRect();
              const style = getComputedStyle(el);
              if (style.display === 'none' || style.visibility === 'hidden') return;
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
