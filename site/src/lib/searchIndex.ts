import { getCollection } from 'astro:content';
import { getRelativeLocaleUrl } from 'astro:i18n';
import { CATEGORY_KEYS, categoryOf, slugOf, type CategoryKey } from './articles';

export interface SearchIndexEntry {
  title: string;
  description: string;
  url: string;
}

/*
 * 톱바 검색(Header.astro)의 "글" 부분이 읽는 정적 인덱스 — 빌드 타임에 그 언어의
 * 글 전체(institutions·lifestyle·news)를 제목·요약·주소만 뽑아 만든다. 실제 파일 검색은
 * /{locale}/search-index.json 을 fetch 해 브라우저에서 substring 매칭한다 — 글 편수가
 * 언어당 최대 80여 편이라 서버·인덱스 라이브러리 없이도 충분하다(오너 지시 2026-08-16:
 * "글 + 임상시험·연구까지 전부" 검색).
 */
export async function buildArticleIndex(locale: string): Promise<SearchIndexEntry[]> {
  const entries = await getCollection(
    'articles',
    (e) => !e.data.draft && e.id.startsWith(`${locale}/`) && (CATEGORY_KEYS as readonly string[]).includes(categoryOf(e)),
  );
  return entries.map((e) => ({
    title: e.data.title,
    description: e.data.description ?? '',
    url: getRelativeLocaleUrl(locale, `${categoryOf(e) as CategoryKey}/${slugOf(e)}`),
  }));
}
