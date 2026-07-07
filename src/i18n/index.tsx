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

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => detectInitialLang());
  // lib/queries.ts, lib/doseSlots.ts 등 React 밖의 순수 함수도 같은 언어를 보게 동기화.
  setCurrentLang(lang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    setCurrentLang(l);
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
