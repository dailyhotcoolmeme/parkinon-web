import { getRelativeLocaleUrl } from 'astro:i18n';
import { t, type DictKey } from '../i18n';

/*
 * 헤더·푸터 메뉴를 여기 한 곳에서만 정의한다.
 *
 * ⚠️ 메뉴는 **언어판마다 개수가 다르다** (계획서 "콘텐츠 — 메뉴 6개", 2026-08-07 확정).
 *   - 전 언어 공통 : 소식 · 생활 요령 · 임상시험   → 소재가 국가에 매이지 않는다
 *   - 해당 국가만   : 운동 영상 · 제도·지원        → 그 나라 공식 자료가 있어야 성립한다
 *   - 도구         : 전 언어 공통이지만 **개방 여부 자체가 미정**
 *
 * 그래서 고정 배열이 아니라 로케일별 목록으로 만든다.
 * 언어를 추가할 때는 LABEL 과 AVAILABLE 에 그 언어 줄만 더하면 된다.
 */

export type NavKey = 'news' | 'lifestyle' | 'clinical' | 'exercise' | 'institutions' | 'tools';

/** 화면에 나오는 순서 (오너 확정 2026-08-07). 언어가 달라도 순서는 같다. */
const ORDER: readonly NavKey[] = ['news', 'lifestyle', 'clinical', 'exercise', 'institutions', 'tools'];

/** 경로는 언어 접두사 없이 적는다 — getRelativeLocaleUrl 이 붙인다. */
const PATH: Record<NavKey, string> = {
  news: 'news',
  lifestyle: 'lifestyle',
  clinical: 'clinical',
  exercise: 'exercise',
  institutions: 'institutions',
  tools: 'tools',
};

/*
 * 언어판별로 **실제로 여는** 메뉴.
 * 여기 없는 키는 헤더·푸터에 나오지 않는다. 페이지가 없는 메뉴를 걸면 404 로 이어지므로
 * "페이지를 만든다 → 이 줄에 키를 추가한다" 순서로 간다.
 */
const AVAILABLE: Record<string, readonly NavKey[]> = {
  // tools    : 페이지는 있으나 개방 여부가 미정이라 일부러 뺐다(오너 2026-08-07).
  // exercise : 0-5 완료(2026-08-07) — 운동 영상 허브
  // clinical : 0-6 완료(2026-08-08) — 임상시험 허브
  ko: ['news', 'lifestyle', 'clinical', 'exercise', 'institutions'],
  /*
   * 영어판 메뉴.
   * - exercise     : 영상이 parkinson.co.kr 한국어 자료라 영어권에 의미가 없어 뺐다.
   * - clinical     : ClinicalTrials.gov 기반이고 TRIAL_COUNTRIES 에 us·ca·au 가 이미 있어 그대로 맞는다.
   * - institutions : 해외판도 한다 — docs/website-plan.md "해외판 제도·지원 스코프
   *   (확정, 2026-08-01)". 영어판은 미국 SSDI(+Medicare·SSI) · 호주 NDIS ·
   *   뉴질랜드 Supported Living Payment · 캐나다 연방(DTC·CPP-D·CDB) 4개국.
   *   ⚠️ 각국 제도는 해마다 바뀐다 — 글마다 basisDate 를 달고 연 1회 재확인한다
   *   (미국 1월 COLA · 뉴질랜드 4월 1일 · 캐나다 1월·7월 · NDIS 비정기).
   */
  en: ['news', 'lifestyle', 'clinical', 'institutions'],
  /*
   * 일본어판 메뉴. 영어판과 같은 이유로 exercise 는 뺐다(영상이 한국어 자료다).
   * institutions : 난병의료비조성제도(指定難病6) 글을 쓰고 2026-08-12 에 열었다.
   *   ⚠️ 일본 제도도 해마다 바뀐다 — 글마다 basisDate 를 달고 연 1회 재확인한다.
   */
  ja: ['news', 'lifestyle', 'clinical', 'institutions'],
};

export interface NavItem {
  key: NavKey;
  href: string;
  label: string;
}

/*
 * 라벨은 사전(`src/i18n`)에서 가져온다. 번역이 없으면 **영어**로 대체되고 빌드 로그에 남는다 —
 * 예전처럼 한국어가 그대로 나오는 일은 없다.
 *
 * AVAILABLE 에 없는 언어는 한국어 목록을 쓴다. 이건 번역 폴백이 아니라
 * "그 나라에 어떤 메뉴를 여느냐"는 별개 결정이라, 언어를 추가할 때 반드시 손봐야 한다.
 */
export function navItemsFor(locale: string): NavItem[] {
  const keys = AVAILABLE[locale] ?? AVAILABLE.ko;
  return ORDER.filter((k) => keys.includes(k)).map((k) => ({
    key: k,
    href: getRelativeLocaleUrl(locale, PATH[k]),
    label: t(locale, `nav.${k}` as DictKey),
  }));
}
