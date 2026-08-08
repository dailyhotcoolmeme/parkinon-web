/*
 * 방문자 나라 — 임상시험·연구 페이지의 "국가 탭에 본인 나라 먼저" 기능용(오너 확정 2026-08-08).
 * Cloudflare Pages Function. 외부 지오로케이션 서비스를 새로 붙이지 않는다 —
 * Cloudflare가 모든 요청에 이미 붙여주는 CF-IPCountry 헤더를 그대로 읽기만 한다.
 * (쿠키·권한 팝업 없음, 이 사이트의 "쿠키 0개" 상태와 충돌하지 않는다.)
 */
export async function onRequest(context) {
  const country = context.request.headers.get('cf-ipcountry');
  return new Response(JSON.stringify({ country: country || null }), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
}
