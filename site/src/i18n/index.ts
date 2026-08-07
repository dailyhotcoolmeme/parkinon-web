import en, { type Dict, type DictKey } from './en';
import ko from './ko';

export type { DictKey };

/*
 * 사전 등록소. 언어를 추가하면 여기 한 줄만 늘리면 된다.
 * astro.config 의 `locales` 에는 있지만 여기 없는 언어는 **아직 사전이 없는 언어**다.
 * 그 언어로 실제 페이지를 만들면 `scripts/check-i18n.mjs` 가 빌드를 실패시킨다.
 */
const DICTS: Record<string, Dict> = { en, ko };

/** 폴백 목적지. 한국어로는 절대 내려가지 않는다 (오너 지시 2026-08-07). */
const FALLBACK_LOCALE = 'en';

export const hasDict = (locale: string) => locale in DICTS;
export const dictLocales = () => Object.keys(DICTS);

/*
 * 폴백이 일어나면 조용히 넘어가지 않는다. 같은 (언어, 키) 조합은 한 번만 알린다.
 * 빌드 로그에 목록으로 남아야 "몇 달째 영어가 나오고 있었다"를 막을 수 있다.
 */
const reported = new Set<string>();
function reportFallback(locale: string, key: DictKey) {
  const mark = `${locale}:${key}`;
  if (reported.has(mark)) return;
  reported.add(mark);
  console.warn(`[i18n] 번역 없음 → 영어로 대체: ${locale} "${key}"`);
}

/*
 * 가짜 언어 검사. PSEUDO_I18N=1 로 빌드하면 모든 문구를 1.4배로 늘려서
 * **번역하기 전에** 레이아웃이 어디서 터지는지 보여준다.
 * 실제 배포에는 절대 켜지 않는다(빌드 명령에 들어 있지 않다).
 */
const PSEUDO = process.env.PSEUDO_I18N === '1';
function pseudo(text: string) {
  const pad = '·'.repeat(Math.max(1, Math.ceil(text.length * 0.4)));
  return `[${text}${pad}]`;
}

interface Translated {
  text: string;
  /** 폴백됐으면 'en'. 아니면 undefined — 그대로 lang 속성에 넣으면 된다. */
  lang?: string;
}

/**
 * 문구를 찾는다. 요청한 언어에 없으면 **영어**로 대체하고 그 사실을 알린다.
 * 폴백 여부까지 알아야 하는 본문 텍스트에는 `tf` 나 `<Tr>` 를 쓸 것.
 */
export function tf(locale: string, key: DictKey): Translated {
  const dict = DICTS[locale];
  const own = dict?.[key];
  if (own !== undefined) return { text: PSEUDO ? pseudo(own) : own };

  reportFallback(locale, key);
  const fallback = DICTS[FALLBACK_LOCALE][key];
  return { text: PSEUDO ? pseudo(fallback) : fallback, lang: FALLBACK_LOCALE };
}

/**
 * 문자열만 필요할 때(placeholder·aria-label·title 등 속성값).
 * 본문에 그대로 찍는 텍스트라면 `<Tr>` 를 쓰는 편이 낫다 — 폴백 시 lang 속성이 붙는다.
 */
export function t(locale: string, key: DictKey): string {
  return tf(locale, key).text;
}

/**
 * 값이 들어가는 문구. `{category}` 같은 자리표시자를 채운다.
 * 문장 순서가 언어마다 달라도 사전 쪽에서 자리를 옮기면 되므로,
 * 문자열을 코드에서 이어붙이지 말고 반드시 이걸 쓸 것.
 */
export function tv(locale: string, key: DictKey, vars: Record<string, string>): string {
  return t(locale, key).replace(/\{(\w+)\}/g, (m, name) => vars[name] ?? m);
}
