// 지금까지 올린 「파킨온 소식」 글 목록 — 다음 번호를 정할 때 쓴다.
// 카페 검색 API 는 404 난다. 목록 API 를 페이지로 넘겨야 한다.
import { connect, CAFE } from './lib.mjs';

const b = await connect();
const p = await b.contexts()[0].newPage();
await p.goto(`https://cafe.naver.com/f-e/cafes/${CAFE.clubId}/menus/${CAFE.menuId}`,
             { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);

const hits = await p.evaluate(async ({ clubId, menuId }) => {
  const found = [];
  for (let page = 1; page <= 10; page++) {
    const u = `https://apis.naver.com/cafe-web/cafe2/ArticleListV2dot1.json` +
              `?search.clubid=${clubId}&search.menuid=${menuId}` +
              `&search.queryType=lastArticle&search.page=${page}&search.perPage=50`;
    const r = await fetch(u, { credentials: 'include' });
    if (!r.ok) return [{ error: r.status }];
    const arts = (await r.json())?.message?.result?.articleList || [];
    if (!arts.length) break;
    for (const a of arts) {
      if ((a.subject || '').includes('파킨온 소식')) {
        found.push({ id: a.articleId, title: a.subject, writer: a.writerNickname });
      }
    }
  }
  return found;
}, { clubId: CAFE.clubId, menuId: CAFE.menuId });

console.log(JSON.stringify(hits, null, 1));
await p.close();
await b.close();
