import type { CollectionEntry } from 'astro:content';
import { t, type DictKey } from '../i18n';

/* 카테고리 = 콘텐츠 폴더 이름. */
export const CATEGORY_KEYS = ['institutions', 'lifestyle', 'news'] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

/*
 * 카테고리 라벨(빵부스러기·사이드 제목)은 사전에서 가져온다.
 * 번역이 없으면 영어로 대체되고 빌드 로그에 남는다 — 한국어가 그대로 나오지 않는다.
 */
export const categoryLabel = (locale: string, key: CategoryKey) => t(locale, `category.${key}` as DictKey);

/*
 * 글 파일 경로 = `언어/카테고리/파일이름`.
 *   src/content/articles/ko/institutions/copayment-reduction-guide.mdx
 *   → entry.id = "ko/institutions/copayment-reduction-guide"
 *
 * 언어를 맨 앞에 둔 이유: 어떤 글이 어떤 언어로 번역됐는지 폴더만 봐도 드러나고,
 * `scripts/check-i18n.mjs` 가 언어별 번역 현황을 표로 뽑을 수 있다.
 */
export const localeOf = (entry: CollectionEntry<'articles'>) => entry.id.split('/')[0];
export const categoryOf = (entry: CollectionEntry<'articles'>) => entry.id.split('/')[1] as CategoryKey;
export const slugOf = (entry: CollectionEntry<'articles'>) => entry.id.split('/').slice(2).join('/');

/** 그 언어·그 카테고리의 글만. 초안(draft)은 뺀다. */
export const inCategory = (locale: string, category: CategoryKey) => (entry: { data: { draft: boolean }; id: string }) =>
  !entry.data.draft && entry.id.startsWith(`${locale}/${category}/`);

/** 그 언어의 글 전체. 언어판 라우트의 getStaticPaths 에서 쓴다. */
export const inLocale = (locale: string) => (entry: { data: { draft: boolean }; id: string }) =>
  !entry.data.draft && entry.id.startsWith(`${locale}/`);

/** 화면 표기는 2026.07.28 형식으로 통일. 서버 시간대에 흔들리지 않게 UTC 기준으로 뽑는다. */
export function formatDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}.${p(d.getUTCMonth() + 1)}.${p(d.getUTCDate())}`;
}

export function sortByDateDesc<T extends CollectionEntry<'articles'>>(list: T[]) {
  return [...list].sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());
}

/*
 * "함께 보면 좋은 글" — 예전엔 그냥 같은 카테고리에서 발행일 최신순 2개였다. 카테고리
 * 하나(생활 요령)에 39편이 섞여 있어 전혀 상관없는 글이 항상 똑같이 뜨는 문제가
 * 있었다(오너 지적 2026-08-09: "본문 내용이랑 맞는 다른 글을 찾아야지").
 *
 * 실제로 본문에서 서로 링크한 글(내가 글 쓸 때 이미 "이건 관련 있다"고 판단해 걸어둔
 * 링크)을 최우선으로 쓴다 — 발행일보다 훨씬 믿을 만한 신호다. 양방향으로 본다(내가
 * 건 링크 + 나를 걸어준 링크). 그래도 부족하면 같은 section(하위분류) 안에서 해시태그가
 * 겹치는 글로 채우고, 그것도 없으면 채우지 않는다(억지로 무관한 글을 보여주지 않는다).
 */
function linkedSlugsIn(body: string | undefined, category: CategoryKey): string[] {
  if (!body) return [];
  const re = new RegExp(`\\]\\(/ko/${category}/([a-z0-9-]+)/?\\)`, 'g');
  const slugs: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    if (!slugs.includes(m[1])) slugs.push(m[1]);
  }
  return slugs;
}

export function findRelatedArticles(
  entry: CollectionEntry<'articles'>,
  siblings: CollectionEntry<'articles'>[],
  max = 2,
): CollectionEntry<'articles'>[] {
  const category = categoryOf(entry);
  const mySlug = slugOf(entry);
  const bySlug = new Map(siblings.map((e) => [slugOf(e), e]));

  // frontmatter `related:`로 직접 지정한 글이 있으면 최우선으로 쓴다(직접 판단한 것이라
  // 가장 정확하다).
  const explicitSlugs = entry.data.related ?? [];
  const explicit = explicitSlugs.map((s) => bySlug.get(s)).filter((e): e is CollectionEntry<'articles'> => !!e);
  if (explicit.length >= max) return explicit.slice(0, max);

  const outgoing = linkedSlugsIn(entry.body, category);
  const incoming = siblings.filter((e) => linkedSlugsIn(e.body, category).includes(mySlug)).map((e) => slugOf(e));
  const linkedSlugs = [...new Set([...outgoing, ...incoming])].filter((s) => !explicitSlugs.includes(s));
  const linked = linkedSlugs.map((s) => bySlug.get(s)).filter((e): e is CollectionEntry<'articles'> => !!e);

  const combined = [...explicit, ...sortByDateDesc(linked)];
  if (combined.length >= max) return combined.slice(0, max);

  /*
   * 그래도 못 채운 나머지는 같은 section(하위분류) 안에서만 고른다 — 카테고리 전체(39편)
   * 대신 최소한 같은 묶음(예: 사람과 상황 11편)으로 좁힌다. 해시태그가 겹치면 그걸
   * 먼저 보여주고, 안 겹쳐도 완전히 무관한 카테고리보다는 같은 section이 낫다.
   */
  const usedSlugs = new Set(combined.map((e) => slugOf(e)));
  const myTags = new Set(entry.data.hashtags);
  const fillCandidates = siblings
    .filter((e) => !usedSlugs.has(slugOf(e)) && entry.data.section && e.data.section === entry.data.section)
    .map((e) => ({ e, overlap: e.data.hashtags.filter((h) => myTags.has(h)).length }))
    .sort((a, b) => b.overlap - a.overlap || b.e.data.publishedAt.getTime() - a.e.data.publishedAt.getTime())
    .map((s) => s.e);

  return [...combined, ...fillCandidates].slice(0, max);
}
