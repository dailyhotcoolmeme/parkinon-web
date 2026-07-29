import { supabase } from './supabase';

export type ExchangeErrorCode = 'invalid' | 'expired' | 'used' | 'locked' | 'unknown';

export type ExchangeResult =
  | { ok: true; language: 'ko' | 'en' | 'fr' | 'ja' }
  | { ok: false; code: ExchangeErrorCode };

/**
 * 6자리 코드를 서버에서 세션으로 교환하고, 성공 시 supabase 세션을 설정한다.
 * URL 자동열기(`/r/:token`)와 PC 수동입력(Landing)이 공통으로 사용한다.
 * 백엔드는 `{ code }`와 레거시 `{ token }` 둘 다 받으므로 `code`로 통일해 보낸다.
 */
export async function exchangeWebToken(code: string): Promise<ExchangeResult> {
  try {
    const { data, error } = await supabase.functions.invoke('exchange-web-token', {
      body: { code },
    });

    if (error) {
      // 비-2xx 응답은 FunctionsHttpError로 던져지며 context는 원본 Response.
      const code = await extractErrorCode(error);
      return { ok: false, code };
    }

    const access_token = (data as { access_token?: string } | null)?.access_token;
    const refresh_token = (data as { refresh_token?: string } | null)?.refresh_token;
    if (!access_token || !refresh_token) {
      return { ok: false, code: 'unknown' };
    }

    const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
    if (setErr) return { ok: false, code: 'unknown' };

    // ko/en 이분법이면 fr/ja 계정이 한국어로 떨어진다 — 지원 언어는 그대로, 모르는 값만 en.
    const raw = (data as { language?: string } | null)?.language ?? 'ko';
    const language = (['ko', 'en', 'fr', 'ja'] as const).includes(raw as never)
      ? (raw as 'ko' | 'en' | 'fr' | 'ja') : 'en';
    return { ok: true, language };
  } catch {
    return { ok: false, code: 'unknown' };
  }
}

async function extractErrorCode(error: unknown): Promise<ExchangeErrorCode> {
  // supabase-js FunctionsHttpError: error.context === Response
  const ctx = (error as { context?: unknown })?.context;
  const res = ctx as Response | undefined;
  if (res && typeof res.json === 'function') {
    try {
      const body = await res.clone().json();
      const code = (body as { error?: string })?.error;
      if (code === 'invalid' || code === 'expired' || code === 'used' || code === 'locked') {
        return code;
      }
    } catch {
      /* fall through to status mapping */
    }
    // body 파싱 실패 시 상태코드로 추정
    if (res.status === 423 || res.status === 429) return 'locked';
    if (res.status === 410) return 'expired';
    if (res.status === 404) return 'invalid';
  }
  return 'unknown';
}

/** i18n 키 매핑 — 실제 문구는 src/i18n/ko.json·en.json의 tokenExchange.error.* */
export const EXCHANGE_ERROR_KEYS: Record<ExchangeErrorCode, string> = {
  invalid: 'tokenExchange.errorInvalid',
  expired: 'tokenExchange.errorExpired',
  used: 'tokenExchange.errorUsed',
  locked: 'tokenExchange.errorLocked',
  unknown: 'tokenExchange.errorUnknown',
};
