// 카페 작업용 크롬을 CDP 포트로 띄운다. 로그인은 오너가 직접 한다.
// 이미 떠 있으면 그대로 두고 알려만 준다 (오너 로그인 세션을 절대 죽이지 않는다).
import { chromium } from '../../site/node_modules/playwright-core/index.mjs';
import { CAFE, WRITE_URL } from './lib.mjs';

const port = Number(process.argv[2] || CAFE.cdpPort);
const profile = process.argv[3] || CAFE.profile;

try {
  const b = await chromium.connectOverCDP(`http://localhost:${port}`);
  const pages = b.contexts()[0].pages();
  console.log(`이미 떠 있다 (포트 ${port}). 열린 탭 ${pages.length}개:`);
  pages.forEach(p => console.log('  ' + p.url()));
  console.log('→ 죽이지 말고 그대로 쓴다.');
  await b.close();
  process.exit(0);
} catch { /* 안 떠 있으면 새로 띄운다 */ }

const ctx = await chromium.launchPersistentContext(profile, {
  channel: 'chrome',
  headless: false,
  viewport: null,
  args: [`--remote-debugging-port=${port}`],
});
const p = ctx.pages()[0] || await ctx.newPage();
await p.goto(CAFE.url);
console.log(`크롬을 띄웠다 (포트 ${port}, 프로필 ${profile}).`);
console.log(`오너가 ${CAFE.account} 계정으로 직접 로그인할 때까지 기다린다.`);
console.log(`글쓰기 주소: ${WRITE_URL}`);
// 프로세스를 끝내면 브라우저가 같이 죽으므로 붙잡아 둔다
await new Promise(() => {});
