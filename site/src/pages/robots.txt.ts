import type { APIRoute } from 'astro';

/*
 * robots.txt 를 빌드 시점에 만든다.
 * dev 배포(parkinon-site-dev.pages.dev)는 색인을 막는다 — 본 사이트와 중복 콘텐츠가 되기 때문.
 * Layout.astro 의 noindex 메타와 같은 조건(호스트가 parkinon.com 인지)을 쓴다.
 * 정식 오픈 때 PUBLIC_SITE_URL=https://parkinon.com 으로 빌드해야 색인이 열린다.
 */
export const GET: APIRoute = ({ site }) => {
  const indexable = site?.host === 'parkinon.com';

  const body = indexable
    ? `User-agent: *
Allow: /

Sitemap: ${new URL('sitemap-index.xml', site).href}
`
    : `# dev 배포 — 색인 금지 (본 사이트와 중복 콘텐츠 방지)
User-agent: *
Disallow: /
`;

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
