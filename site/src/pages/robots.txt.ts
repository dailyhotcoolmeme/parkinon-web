import type { APIRoute } from 'astro';

/*
 * robots.txt 를 빌드 시점에 만든다.
 * dev 배포(parkinon-site-dev.pages.dev)는 색인을 막는다 — 본 사이트와 중복 콘텐츠가 되기 때문.
 * Layout.astro 의 noindex 메타와 같은 조건(호스트가 parkinon.com 인지)을 쓴다.
 * 정식 오픈 때 PUBLIC_SITE_URL=https://parkinon.com 으로 빌드해야 색인이 열린다.
 *
 * ⚠️ 2026-08-10 정식 오픈 때 이 env 를 안 주고 빌드해서, 실제로는 parkinon.com에
 * 떠 있는데도 robots.txt가 "Disallow: /"로 나간 사고가 있었다 — merge-deploy.mjs 가
 * PUBLIC_SITE_URL을 명시적으로 넘기도록 고쳤다. 정식 배포 후엔 항상 실제 주소에서
 * robots.txt·sitemap·meta robots 세 가지를 직접 curl로 재확인할 것(빌드 로그만 보고
 * 안심하지 말 것 — 로그는 dev 기준으로 통과해도 프로덕션 env가 빠지면 조용히 틀리게 나간다).
 *
 * /app/ 는 색인에서 뺀다 — 6자리 코드 입력용 로그인 화면이라 검색에 잡힐 콘텐츠가 없다.
 *
 * ⚠️ /ko/tools/ 는 2026-08-07~09-07 "공개 여부 미정"으로 막아 뒀었다(nav.ts 에도 안 걸어 둠).
 * 그런데 sitemap 에 없어도 구글이 어딘가에서 이 URL 을 찾아내 크롤했고, robots.txt 가
 * 막고 있으니 Search Console 이 "robots.txt에 의해 차단됨"을 반복 알림으로 보냈다
 * (2026-09-06 밤 세 통 연속). 오너 지시(2026-09-07): 막지 말고 열어라 — 색인을 허용한다.
 * astro.config.mjs 의 sitemap 필터도 같이 열었다. nav.ts 는 그대로 뒀다(메뉴 노출은 별개 결정).
 *
 * ⚠️ 언어 차단은 **지금 없다(2026-09-01)**. 2026-08-16 ~ 08-31 에는 여기에
 * `Disallow: /en/` `/ja/` `/fr/` 가 있었다 — "애드센스 심사는 한국어만 보이게" 해둔
 * 상태에서 merge-deploy.mjs 가 사이트 전체를 통째로 올리는 구조라, 다른 기능 배포 도중
 * 영어 88개·일본어 63개 URL 이 sitemap 에 실려 나간 사고가 있었기 때문이다.
 * 2026-08-30 애드센스가 parkinon.com 을 거절했고 재심사를 한참 뒤로 미루기로 하면서,
 * 오너 지시로 en/ja/fr 을 모두 열었다.
 *
 * 다시 막을 때는 여기에 Disallow 를 되살리는 것만으로는 부족하다 — astro.config.mjs 의
 * sitemap 필터, scripts/merge-deploy.mjs 와 scripts/guard-production-locales.mjs 의
 * BLOCKED_LOCALES 까지 **네 곳을 같은 값으로** 고쳐야 한다.
 * 검사 스크립트: site/scripts/check-blocked-locales.mjs
 */
export const GET: APIRoute = ({ site }) => {
  const indexable = site?.host === 'parkinon.com';

  const body = indexable
    ? `User-agent: *
Allow: /
Disallow: /app/
Disallow: /*/search-index.json

Sitemap: ${new URL('sitemap-index.xml', site).href}
`
    : `# dev 배포 — 색인 금지 (본 사이트와 중복 콘텐츠 방지)
User-agent: *
Disallow: /
`;

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
