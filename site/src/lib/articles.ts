import type { CollectionEntry } from 'astro:content';

/* 카테고리 = 콘텐츠 폴더 이름. 라벨·설명을 여기 한 곳에서만 관리한다. */
export const CATEGORY = {
  institutions: { label: '제도·지원' },
  lifestyle: { label: '생활 요령' },
  news: { label: '파킨온 소식' },
} as const;

export type CategoryKey = keyof typeof CATEGORY;

/** entry.id = "institutions/copayment-reduction-guide" */
export const categoryOf = (entry: CollectionEntry<'articles'>) => entry.id.split('/')[0] as CategoryKey;
export const slugOf = (entry: CollectionEntry<'articles'>) => entry.id.split('/').slice(1).join('/');

/** 화면 표기는 2026.07.28 형식으로 통일. 서버 시간대에 흔들리지 않게 UTC 기준으로 뽑는다. */
export function formatDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}.${p(d.getUTCMonth() + 1)}.${p(d.getUTCDate())}`;
}

export function sortByDateDesc<T extends CollectionEntry<'articles'>>(list: T[]) {
  return [...list].sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());
}
