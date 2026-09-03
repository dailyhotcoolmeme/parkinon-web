// 지난 카페 글의 구조를 그대로 뽑는다 — 형식을 기억으로 쓰지 말고 이걸로 대조한다.
//   node scripts/naver-cafe/dump-post.mjs 48774
import { connect, articleFrame, articleUrl } from './lib.mjs';

const id = process.argv[2];
if (!id) { console.error('글번호를 넣어라. 예: node dump-post.mjs 48774'); process.exit(1); }

const b = await connect();
const p = await b.contexts()[0].newPage();
await p.goto(articleUrl(id), { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(6000);

const f = await articleFrame(p);
if (!f) { console.error('본문 프레임을 못 찾았다. 로그인 상태인지 확인해라.'); process.exit(1); }

const out = await f.evaluate(() => {
  const c = document.querySelector('.se-main-container');
  return {
    components: [...c.querySelectorAll('.se-component')].map((e, i) => ({
      i,
      type: e.className.replace('se-component ', '').replace(' __se-component', ''),
      images: [...e.querySelectorAll('img')].map(im => im.getAttribute('src')),
      text: e.innerText.trim().replace(/\n+/g, ' ⏎ '),
    })),
    links: [...c.querySelectorAll('a')].filter(a => a.getAttribute('href'))
      .map(a => ({ text: a.innerText.trim().replace(/\s+/g, ' '), href: a.getAttribute('href') })),
  };
});
console.log(JSON.stringify(out, null, 1));
await p.close();
await b.close();
