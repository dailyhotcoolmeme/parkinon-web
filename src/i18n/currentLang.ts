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

export function isEnLang(): boolean {
  return current === 'en';
}
