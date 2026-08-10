/*
 * /app/* 캐치올 — React Router(SPA) 클라이언트 라우팅 폴백.
 *
 * `_redirects`의 `/app/* /_app-fallback/index.html 200` 규칙으로 처리하려 했으나
 * 실제 배포에서는 안 먹혔다(2026-08-10, 오너가 `/app/admin`에서 대문(언어 게이트)이
 * 뜨는 걸 발견 — `/app/*` 아래 실제 파일이 없는 모든 하위 경로가 이 규칙 대신
 * Cloudflare의 기본 폴백으로 사이트 루트 index.html(Astro 대문)을 서빙하고 있었음).
 * 원인은 명확히 못 찾았지만(`_redirects` 파일 자체·`_app-fallback/index.html` 둘 다
 * 로컬 빌드에선 정상), Pages Functions(`env.ASSETS.fetch`)는 이 프로젝트에서 이미
 * `/api/*`로 검증된 안정적인 경로라 그쪽으로 옮겼다.
 *
 * `public/_routes.json`의 include에 `/app/*`를 추가해야 이 함수가 호출된다(안 하면
 * Pages가 애초에 이 함수를 안 태움).
 */
export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);

  // 확장자가 있는 요청(js/css/이미지 등 실제 정적 파일)은 에셋 서빙에 맡긴다 —
  // 이 함수가 없어도 정적 파일은 이미 정상 서빙되고 있었으니 건드리지 않는다.
  if (/\.[a-zA-Z0-9]+$/.test(url.pathname)) {
    return context.next();
  }

  // '/app/index.html'로 요청하면 Cloudflare 정적 서빙이 인덱스 파일 정규화를 위해
  // '/app/'로 308 리다이렉트해버린다(실측 확인, 2026-08-10) — 그래서 처음부터
  // 트레일링 슬래시가 붙은 '/app/'를 직접 요청해서 그 리다이렉트를 피한다.
  const assetUrl = new URL(url);
  assetUrl.pathname = '/app/';
  const assetRequest = new Request(assetUrl.toString(), context.request);
  return (context.env as any).ASSETS.fetch(assetRequest);
};
