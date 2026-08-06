import { defineConfig } from 'astro/config';

/*
 * 다국어 URL 구조 (2026-08-06 오너 확정): **모든 언어에 접두사**를 붙인다.
 *   /ko/institutions · /en/institutions · /fr/institutions · /ja/institutions
 * 루트(/)는 Cloudflare Pages `_redirects` 로 /ko/ 에 보낸다(public/_redirects).
 *
 * 근거:
 * - Google "다지역·다국어 사이트 관리" — 하위 디렉터리 방식은 설정·유지보수가 쉽다.
 *   URL 파라미터(?lang=)는 권장하지 않는다. 브라우저 언어로 자동 리다이렉트하지 말 것.
 * - Google "현지화 버전" — hreflang 은 상호 링크·자기참조가 필수이고 x-default 를 권장한다.
 *   ⚠️ Astro 는 hreflang 을 자동 생성하지 않는다 → Layout.astro 에서 직접 넣는다.
 *
 * ⚠️ URL 구조는 나중에 바꾸면 검색 순위를 잃는다. 여기 값을 임의로 고치지 말 것.
 */
export default defineConfig({
  outDir: './dist',
  // hreflang·canonical 은 절대 URL 이어야 한다. 배포 대상에 맞춰 빌드 시 주입한다.
  // (dev 배포는 기본값, 정식 오픈 때 PUBLIC_SITE_URL=https://parkinon.com 로 빌드)
  site: process.env.PUBLIC_SITE_URL ?? 'https://parkinon-site-dev.pages.dev',
  i18n: {
    locales: ['ko', 'en', 'fr', 'ja'],
    defaultLocale: 'ko',
    routing: {
      prefixDefaultLocale: true,
    },
  },
});
