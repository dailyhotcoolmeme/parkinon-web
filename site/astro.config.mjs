import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import remarkGfm from 'remark-gfm';

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
/*
 * 본문 표를 <div class="table-scroll"> 로 감싼다.
 *
 * 표는 열이 많으면 화면보다 넓어질 수밖에 없다. 감싸지 않으면 그 넓이가 그대로 문서
 * 전체 폭이 되어, 좁은 화면에서 **페이지 전체가 옆으로 밀리고 반쪽으로 찌그러진다**
 * (2026-08-14 오너 지적으로 발견 — 일본어 제도 글의 표가 360px 화면에서 1014px였다).
 * 표에 직접 overflow 를 걸면 표가 자기 폭으로 줄어들어 넓은 화면에서 꽉 차지 않으므로,
 * 바깥을 감싸는 방식으로 한다 — 표 생김새는 그대로 두고 넘칠 때만 표 안에서 스크롤한다.
 * 스크롤바는 숨긴다(오너 규칙: 가로 스크롤바 노출 금지).
 */
function rehypeTableScroll() {
  return (tree) => {
    const walk = (node) => {
      if (!node.children) return;
      node.children = node.children.map((child) => {
        walk(child);
        if (child.type === 'element' && child.tagName === 'table') {
          return {
            type: 'element',
            tagName: 'div',
            properties: { className: ['table-scroll'] },
            children: [child],
          };
        }
        return child;
      });
    };
    walk(tree);
  };
}

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
  /*
   * sitemap-index.xml / sitemap-0.xml 을 만든다. robots.txt 가 이 주소를 가리킨다.
   * ⚠️ sitemap 의 i18n 옵션은 **아직 켜지 않는다.** 켜면 아직 만들지도 않은 /en/·/fr/·/ja/
   *    주소까지 alternate 로 적어 버린다(hreflang 상호 링크 위반). 번역판을 실제로 만들 때 켤 것.
   */
  /*
   * remark-gfm 의 singleTilde 옵션은 기본값이 true 라, "1~6급"처럼 범위를 나타내려고 쓴
   * 홑물결(~) 두 개가 같은 문단 안에 있으면 그 사이 전체를 취소선(<del>)으로 지워버린다
   * (오너 발견 2026-08-09: 장애등록 글에서 "1~6급"과 "80~96점" 사이 문장 전체가 사라짐).
   * 물결표는 이 사이트 글에서 숫자 범위 표기로 흔히 쓰므로 홑물결 취소선은 아예 끈다 —
   * 진짜 취소선이 필요하면 **~~물결 두 개~~**를 쓰면 된다(GFM 표준 문법은 그대로 켜져 있음).
   */
  markdown: {
    gfm: false,
    remarkPlugins: [[remarkGfm, { singleTilde: false }]],
    rehypePlugins: [rehypeTableScroll],
  },
  // 글은 마크다운(MDX)으로 쓴다 — 본문 안에서 블록 컴포넌트(절차 카드·체크리스트 등)를 쓰기 위함
  integrations: [
    mdx(),
    sitemap({
      /*
       * 시안·미리보기 페이지는 사이트맵에서 뺀다.
       * /tools 도 뺀다 — 헤더·푸터 메뉴에는 일부러 안 걸어둔 "열지 말지 추후 결정" 상태인데
       * (nav.ts 참고) 사이트맵엔 그대로 들어가 있어서 검색엔진이 찾을 수 있었다
       * (2026-08-10 애드센스 신청 준비하며 발견 — 아직 오너가 공개 여부를 안 정한 페이지가
       * 조용히 색인 대상이 되고 있었다).
       *
       * 언어 제외 필터는 **지금 없다 = 전 언어가 사이트맵에 들어간다(2026-09-01).**
       * 2026-08-16 ~ 08-31 에는 여기에 로케일 제외 정규식이 하나 더 있었다
       * ("애드센스 심사는 한국어만 보이게"). 08-30 애드센스가 parkinon.com 을 거절했고,
       * 재심사를 한참 뒤로 미루기로 하면서 오너 지시로 전 언어를 열었다.
       *
       * 다시 막을 때는 그 줄을 되살리되 **robots.txt.ts 의 Disallow · merge-deploy.mjs 와
       * guard-production-locales.mjs 의 BLOCKED_LOCALES 를 같은 값으로 함께** 고칠 것.
       * 한 곳만 고치면 모순이 생긴다.
       *
       * 2026-08-24 실제 사고: 프랑스어를 추가하면서 robots.txt 와 merge-deploy 에는
       * fr 를 넣었는데 **여기(사이트맵 필터)만 빠뜨렸다.** 그 결과 프로덕션에 있지도 않은
       * /fr/ 주소 59개가 사이트맵에 실려 나갔고, 구글이 "사이트맵에 있는데 robots.txt 가
       * 막고 있다"며 색인 오류 메일을 보냈다(Search Console, 2026-08-23).
       * 네 곳을 함께 검사하는 스크립트: site/scripts/check-blocked-locales.mjs
       */
      filter: (page) =>
        !page.includes('/preview/') &&
        !page.includes('/tools') &&
        !page.includes('search-index.json'),
    }),
  ],
});
