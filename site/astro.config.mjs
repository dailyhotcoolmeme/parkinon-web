import { defineConfig } from 'astro/config';

// 스캐폴딩 단계 — i18n(ko/en/fr/ja) 라우팅과 hreflang은 실제 페이지를 이식할 때 붙인다.
// (website-plan.md: "다국어 URL 구조 + hreflang을 미리 잡아둔다" — 이 단계에서는 아직 안 함)
export default defineConfig({
  outDir: './dist',
});
