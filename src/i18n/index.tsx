import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import ko from './ko.json';
import en from './en.json';
import { setCurrentLang } from './currentLang';

export type Lang = 'ko' | 'en';

const RESOURCES: Record<Lang, Record<string, string>> = { ko, en };
const STORAGE_KEY = 'parkinon-web-lang';
const FALLBACK_LANG: Lang = 'en';

/**
 * 앱(react-i18next)과 달리 이 웹은 로그인 전(토큰 교환 스피너 단계)엔 계정을 모를 수 있어
 * 브라우저 언어로 먼저 추정하고, exchange-web-token이 users.language를 돌려주면
 * 그 값으로 확정한다(앱과 동일 계정=동일 언어). 새로고침 대비 localStorage에도 저장.
 */
function detectInitialLang(): Lang {
  // ⚠️ URL 의 ?lang= 이 최우선. 앱이 "웹으로 보기"로 넘길 때 계정 언어를 실어 보내므로,
  //   토큰 교환(계정 확인) 전인 로딩 화면부터 정확한 언어로 뜬다.
  //   이게 없으면 이전 방문 때 저장된 localStorage 값이나 브라우저 언어를 쓰게 되어,
  //   영어 사용자에게 한국어 로딩 화면이 보인다(오너 제보 2026-07-27).
  try {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (q === 'ko' || q === 'en') {
      try { localStorage.setItem(STORAGE_KEY, q); } catch { /* 무시 */ }
      return q;
    }
  } catch { /* URL 파싱 불가 — 무시 */ }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'ko' || stored === 'en') return stored;
  } catch { /* localStorage 접근 불가(사파리 프라이빗 등) — 무시 */ }
  const nav = typeof navigator !== 'undefined' ? navigator.language : '';
  return nav.toLowerCase().startsWith('ko') ? 'ko' : FALLBACK_LANG;
}

interface LocaleCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleCtx | null>(null);

/**
 * 문서 제목은 index.html 에 한국어로 고정돼 있어(정적 파일) 영어 사용자에게도 그대로 보인다.
 * 언어가 정해질 때마다 갱신해 로딩 중 탭 제목까지 사용자 언어를 따르게 한다.
 */
function applyDocTitle(l: Lang): void {
  try {
    document.title = l === 'ko' ? '파킨온 - 기록 보기' : 'ParkinON — Records';
  } catch { /* document 없음 — 무시 */ }
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => detectInitialLang());
  // lib/queries.ts, lib/doseSlots.ts 등 React 밖의 순수 함수도 같은 언어를 보게 동기화.
  setCurrentLang(lang);
  applyDocTitle(lang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    setCurrentLang(l);
    applyDocTitle(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* 무시 */ }
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const dict = RESOURCES[lang] ?? RESOURCES[FALLBACK_LANG];
    let str = dict[key] ?? RESOURCES[FALLBACK_LANG][key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      }
    }
    return str;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useT() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useT must be used inside LocaleProvider');
  return ctx;
}
