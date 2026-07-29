import type { Lang } from './index';

/**
 * 순수 함수(lib/queries.ts, lib/doseSlots.ts 등, React 컴포넌트가 아님)에서도 현재 언어를
 * 읽을 수 있게 하는 모듈 전역 값. 앱(parkinon-app)의 `i18n.language` 전역 읽기 패턴과 동일한
 * 목적 — LocaleProvider가 lang이 바뀔 때마다 이 값을 갱신한다.
 */
let current: Lang = 'ko';

export function setCurrentLang(lang: Lang): void {
  current = lang;
}

export function getCurrentLang(): Lang {
  return current;
}

/**
 * "한국어가 아닌가" — 이름과 달리 en 전용이 아니다.
 * fr/ja 추가(2026-07-30) 때 `current === 'en'` 그대로면 프랑스어·일본어 사용자가
 * 한국어 분기로 떨어져 한글이 노출된다. 이분법 호출부(약 120곳)의 의미는 전부
 * "해외면 영어/현지 표기"이므로 non-ko 판정으로 뒤집는 것이 맞다.
 */
export function isEnLang(): boolean {
  return current !== 'ko';
}
