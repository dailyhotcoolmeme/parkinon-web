// 네이버 카페 「파킨온 소식」 공용 설정·헬퍼
// 사용법은 docs/naver-cafe-news.md 참고
import { chromium } from '../../site/node_modules/playwright-core/index.mjs';

export const CAFE = {
  url: 'https://cafe.naver.com/parkinson777',
  clubId: '11763699',
  menuId: '3',              // 자유로운글
  account: '김포사위',
  cdpPort: 9502,
  profile: process.env.HOME + '/Library/Caches/parkinon-naver-profile',
};

export const WRITE_URL =
  `https://cafe.naver.com/ca-fe/cafes/${CAFE.clubId}/menus/${CAFE.menuId}/articles/write`;

export const articleUrl = (id) =>
  `https://cafe.naver.com/f-e/cafes/${CAFE.clubId}/articles/${id}?menuid=${CAFE.menuId}`;

/** 이미 떠 있는 CDP 크롬에 붙는다. 안 떠 있으면 안내하고 종료. */
export async function connect(port = CAFE.cdpPort) {
  try {
    return await chromium.connectOverCDP(`http://localhost:${port}`);
  } catch {
    console.error(
      `포트 ${port} 에 크롬이 없다. 먼저 띄워라:\n` +
      `  node scripts/naver-cafe/launch.mjs\n` +
      `그리고 오너가 직접 로그인할 때까지 기다린다.`);
    process.exit(1);
  }
}

/** 카페 글 본문은 iframe 안에 있다. .se-main-container 가 있는 프레임을 찾아준다. */
export async function articleFrame(page) {
  for (const f of page.frames()) {
    try {
      if (await f.evaluate(() => !!document.querySelector('.se-main-container'))) return f;
    } catch { /* cross-origin */ }
  }
  return null;
}
