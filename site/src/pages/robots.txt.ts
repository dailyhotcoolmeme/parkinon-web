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
 * /ko/tools/ 도 뺀다 — 헤더·푸터엔 안 걸려 있는 "공개 여부 미정" 페이지다(nav.ts 참고).
 *
 * ⚠️ /en/·/ja/·/fr/ 도 뺀다(2026-08-16 오너 지시, 강력 조치 지시) — "애드센스 심사는
 * 한국어만 보이게" 해둔 상태였는데, merge-deploy.mjs 가 사이트 전체(모든 언어)를 통째로
 * 프로덕션에 올리는 구조라 다른 기능 배포(임상시험 검색 API, 톱바 검색 등) 도중 영어
 * 88개·일본어 63개 URL 이 통째로 sitemap 에 실려 나간 사고가 있었다. 애드센스 통과
 * 전까지는 한국어 외 언어는 프로덕션에 **아예 배포되지 않는다**(merge-deploy.mjs 가
 * en/ja/fr 디렉터리 자체를 복사에서 뺀다 — 이 robots.txt 규칙은 2중 안전장치다).
 * 이 규칙은 오너가 애드센스 통과를 확인해줄 때까지 지우지 말 것.
 */
export const GET: APIRoute = ({ site }) => {
  const indexable = site?.host === 'parkinon.com';

  const body = indexable
    ? `User-agent: *
Allow: /
Disallow: /app/
Disallow: /ko/tools/
Disallow: /en/
Disallow: /ja/
Disallow: /fr/
Disallow: /*/search-index.json

Sitemap: ${new URL('sitemap-index.xml', site).href}
`
    : `# dev 배포 — 색인 금지 (본 사이트와 중복 콘텐츠 방지)
User-agent: *
Disallow: /
`;

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
