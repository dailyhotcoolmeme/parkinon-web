import type { CollectionEntry } from 'astro:content';
import type { DictKey } from '../i18n';
import { slugOf, categoryOf } from './articles';

/*
 * 글이 **어느 나라 이야기인가**.
 *
 * 왜 필요한가(오너 지시 2026-08-13):
 *   "미국 사람이 뉴질랜드 제도 볼 일이 없을테니"
 *   "뉴질랜드 사람인데 홈화면에 미국 정보가 나오면 안된다. 물론 전세계 공통된 정보는 괜찮다"
 *
 * 실제로 이걸 넣기 전 영어판 홈의 최신 8건이 **전부 미국 제도 글**이었다. 뉴질랜드에서
 * 접속하면 자기와 상관없는 미국 정보만 보이는 상태였다.
 *
 * 나라를 가리는 기준은 두 가지뿐이다.
 *   1. 제도·지원 글  → 슬러그 접두사로 나라가 정해진다 (아래 PREFIX)
 *   2. 그 외 모든 글  → **나라 없음(null)**. 증상·생활 요령·연구 소식은 어디 살든 같다.
 *
 * null 인 글은 어느 나라에서 접속하든 보인다. 그게 "전세계 공통된 정보는 괜찮다"에 해당한다.
 */

/** 영어판이 다루는 나라. 순서는 서버 렌더 기본 순서다(클라이언트가 접속 국가를 맨 앞으로 옮긴다). */
export const EN_COUNTRIES = [
  { code: 'us', labelKey: 'country.us' },
  { code: 'ca', labelKey: 'country.ca' },
  { code: 'au', labelKey: 'country.au' },
  { code: 'nz', labelKey: 'country.nz' },
] as const satisfies readonly { code: string; labelKey: DictKey }[];

export type CountryCode = (typeof EN_COUNTRIES)[number]['code'];

/*
 * 제도 글 슬러그 접두사 → 나라.
 * ⚠️ 새 나라를 열면 여기와 EN_COUNTRIES 두 곳을 함께 고칠 것. 접두사만 늘리고 탭을 안 늘리면
 *    그 글은 어느 탭에도 안 나온다(아래 검사가 빌드를 실패시킨다).
 */
const PREFIX: Record<string, CountryCode> = {
  'us-': 'us',
  'canada-': 'ca',
  'australia-': 'au',
  'new-zealand-': 'nz',
};

/**
 * 이 글이 어느 나라 것인가. 나라를 안 타는 글이면 null.
 *
 * 영어판 제도 글만 나라를 갖는다 — 일본어·한국어판은 그 자체로 한 나라라서 가를 필요가 없다.
 */
export function countryOf(entry: CollectionEntry<'articles'>): CountryCode | null {
  if (categoryOf(entry) !== 'institutions') return null;
  if (!entry.id.startsWith('en/')) return null;
  const slug = slugOf(entry);
  for (const [p, code] of Object.entries(PREFIX)) {
    if (slug.startsWith(p)) return code;
  }
  return null;
}

/**
 * 접속 국가에서 이 글을 보여줄 것인가.
 * 나라 없는 글(null)은 언제나 보여준다 — 전세계 공통 정보다.
 */
export function visibleIn(entry: CollectionEntry<'articles'>, country: CountryCode): boolean {
  const c = countryOf(entry);
  return c === null || c === country;
}

/**
 * 영어판 제도 글인데 나라를 못 가려낸 것을 찾는다. 하나라도 있으면 그 글은 **어느 탭에도
 * 안 나온다** — 조용히 사라지는 것이 가장 나쁘므로 빌드를 실패시킨다.
 * `scripts/check-en-terms.mjs` 가 아니라 페이지에서 부르는 이유는, 이 판정이 슬러그 규칙과
 * 탭 목록에 동시에 걸려 있어서 둘 중 하나만 고쳐도 깨지기 때문이다.
 */
export function assertAllCountried(entries: CollectionEntry<'articles'>[]): void {
  const orphans = entries
    .filter((e) => e.id.startsWith('en/') && categoryOf(e) === 'institutions')
    .filter((e) => countryOf(e) === null)
    .map((e) => slugOf(e));
  if (orphans.length) {
    /* i18n-exempt:start — 방문자에게 보이지 않는 빌드 실패 메시지다(개발자만 콘솔에서 본다).
       사전을 거칠 이유가 없다. */
    throw new Error(
      `영어 제도 글의 나라를 가려낼 수 없다: ${orphans.join(', ')}\n` +
        `  슬러그를 ${Object.keys(PREFIX).join(' / ')} 중 하나로 시작하게 하거나,\n` +
        `  새 나라라면 src/lib/articleCountry.ts 의 PREFIX 와 EN_COUNTRIES 에 함께 추가할 것.`
    );
    /* i18n-exempt:end */
  }
}
