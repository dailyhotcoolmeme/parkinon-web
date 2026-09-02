/*
 * www 를 apex 로 넘긴다 — `www.parkinon.com` → `parkinon.com` (301).
 *
 * ★ 왜 여기서 하나 (2026-09-02)
 * Pages 커스텀 도메인은 도메인끼리 자동으로 리다이렉트해 주지 않는다. 이 프로젝트에는
 * 도메인이 넷 붙어 있는데(`parkinon.com`·`www.parkinon.com`·`parkinon.co.kr`·
 * `www.parkinon.co.kr`) `.co.kr` 둘만 301 이 걸려 있고 **`www.parkinon.com` 은 200 으로
 * 같은 내용을 그대로 주고 있었다** — 같은 글을 두 주소로 크롤당한다.
 *
 * ⚠️ **`_redirects` 로는 못 한다.** Cloudflare 공식 문서가 "Domain-level redirects ❌"
 *    라고 못 박고 있다. 소스에 도메인을 써도 무시되고 경로만 매칭돼서, 자칫
 *    **apex 가 자기 자신으로 무한 리다이렉트**한다. 시험 삼아라도 넣지 말 것.
 * ⚠️ Cloudflare **Redirect Rules** 로 하는 것이 원래 정석이지만 zone 쓰기 권한이 있는
 *    토큰이 없다(wrangler OAuth 는 `zone (read)` 까지다). 대시보드 자동 로그인도 막혔다
 *    — 저장 비번은 있는데 키체인이 GUI 인증을 요구한다.
 *    **오너가 Redirect Rule 을 걸어 주면 이 파일은 지워도 된다.**
 *
 * 성능: `_routes.json` 의 `exclude` 로 정적 자산(해시 붙은 번들·이미지·폰트)을 빼 두었다.
 * 그래서 이 함수는 실질적으로 HTML 문서 요청에서만 돈다.
 */
export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);

  if (url.hostname === 'www.parkinon.com') {
    url.hostname = 'parkinon.com';
    return Response.redirect(url.toString(), 301);
  }

  return context.next();
};
