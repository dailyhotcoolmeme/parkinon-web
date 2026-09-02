/*
 * "지금 보고 있는 이 페이지는 어떤 언어들로 존재하는가"를 한 곳에서 계산한다.
 *
 * 쓰는 곳이 둘이고, **둘이 어긋나면 안 된다.**
 *   1) Layout.astro — hreflang (검색엔진에게 "이 네 주소는 같은 글의 번역판"이라고 알림)
 *   2) Footer.astro — 언어 전환 UI (사람이 직접 다른 언어로 넘어가는 통로)
 *
 * 왜 경로(pathname)만 받는가:
 * 페이지마다 props 를 새로 넘기게 하면 **넘기는 걸 빠뜨린 페이지에서 조용히 사라진다.**
 * 실제로 그렇게 돼 있었다 — Layout 에 hreflang 코드가 멀쩡히 있는데도 `translations` 를
 * 넘기는 페이지가 하나도 없어서, 2026-09-01 까지 사이트 전체에 hreflang 이 한 줄도
 * 나가지 않았다(라이브에서 `rel="alternate"` 0개 확인). 경로만 보면 페이지가 늘어도
 * 자동으로 따라온다.
 *
 * ⚠️ 없는 번역을 가리키면 404 로 이어진다. 그래서 **글은 실제 콘텐츠 컬렉션을 뒤져서**
 *   그 언어에 파일이 있는지 확인하고, 정적 페이지만 아래 목록으로 판단한다.
 */
import { getCollection } from 'astro:content';
import { publishedLocales } from './publishedLocales';

export const LOCALES = ['ko', 'en', 'ja', 'fr', 'es', 'pt'] as const;
export type Locale = (typeof LOCALES)[number];

/** 네 언어에 모두 있는 정적 경로(언어 접두사 뒤 부분). 빈 문자열은 그 언어의 홈이다. */
const COMMON_STATIC = new Set(['', 'clinical', 'privacy', 'lifestyle', 'institutions', 'news']);

/*
 * 한국어에만 있는 경로. 여기 있는 페이지에서는 다른 언어로 "같은 페이지"를 줄 수 없으므로
 * 그 언어의 홈으로 보낸다.
 *   exercise — 운동 영상. 나라마다 그 나라 기관 영상으로 새로 큐레이션한다(오너 확인 2026-08-07).
 *   tools    — 공개 여부 미정 페이지(nav 에 안 걸려 있고 robots 로도 막혀 있다).
 *   preview  — 시안 페이지.
 */
const KO_ONLY = new Set(['exercise', 'tools', 'preview']);

export interface LocaleLink {
  code: Locale;
  /** 그 언어에서 **같은 내용**을 볼 수 있는 주소. 번역이 없으면 그 언어의 홈. */
  href: string;
  /** 같은 글의 번역이 실제로 있는가. hreflang 은 이게 true 인 것만 내보낸다. */
  exact: boolean;
}

/** `/ko/news/foo/` → `{ locale: 'ko', rest: 'news/foo' }`. 언어 접두사가 없으면 null. */
function split(pathname: string): { locale: Locale; rest: string } | null {
  const parts = pathname.split('/').filter(Boolean);
  const first = parts[0] as Locale;
  if (!LOCALES.includes(first)) return null;
  return { locale: first, rest: parts.slice(1).join('/') };
}

/**
 * 이 경로가 어떤 언어들로 존재하는지 계산한다.
 * 언어 접두사가 없는 경로(대문 `/`, 앱 `/app/…`)에서는 빈 배열을 준다 — 전환할 대상이 없다.
 */
export async function localeLinksFor(pathname: string): Promise<LocaleLink[]> {
  const here = split(pathname);
  if (!here) return [];

  /*
   * 골격만 있고 글이 없는 언어는 아예 내보내지 않는다 — 빈 사이트로 보내는 링크가
   * 되기 때문이다(2026-09-02, 포르투갈어에서 실제로 그랬다). 글이 생기면 자동으로 켜진다.
   */
  const live = await publishedLocales();

  const seg = here.rest.split('/').filter(Boolean);
  const head = seg[0] ?? '';
  const slug = seg.slice(1).join('/');

  // 글 상세 — 그 언어에 실제로 파일이 있는지 컬렉션에서 확인한다.
  const isArticle = slug.length > 0 && (head === 'lifestyle' || head === 'institutions' || head === 'news');
  const existing = isArticle
    ? new Set(
        (await getCollection('articles', (e) => !e.data.draft && e.id.endsWith(`/${head}/${slug}`))).map(
          (e) => e.id.split('/')[0],
        ),
      )
    : null;

  return LOCALES.filter((code) => live.has(code)).map((code) => {
    const home = `/${code}/`;
    if (isArticle) {
      const has = existing!.has(code);
      return { code, href: has ? `/${code}/${head}/${slug}/` : home, exact: has };
    }
    if (KO_ONLY.has(head)) {
      // 한국어에만 있는 페이지 — 한국어만 정확하고 나머지는 홈으로 보낸다.
      return { code, href: code === 'ko' ? pathname : home, exact: code === 'ko' };
    }
    if (COMMON_STATIC.has(head)) {
      return { code, href: `/${code}/${here.rest}${here.rest ? '/' : ''}`, exact: true };
    }
    // 모르는 경로 — 홈으로 보내되 hreflang 에는 넣지 않는다(틀린 짝을 알리느니 안 알린다).
    return { code, href: home, exact: code === here.locale };
  });
}
