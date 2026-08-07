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
