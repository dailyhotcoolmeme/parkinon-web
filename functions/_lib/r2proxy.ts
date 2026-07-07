// 파킨온 운영자 admin — R2 비공개 미디어 표시용 워커 프록시 토큰 URL 생성.
//
// 배경: R2 버킷이 비공개라 r2_url 직접 <img> 는 401. 표시는 워커(parkinon-media-proxy)
//   프록시 + HMAC 토큰 URL 경유로만 가능하다.
//   토큰 = HMAC-SHA256(R2_PROXY_SECRET, `${key}\n${exp}`) 소문자 hex. exp = now + 3600(1시간).
//   key 의 슬래시는 path 구분자로 유지하고 각 세그먼트만 encodeURIComponent.
//   → 앱 supabase/functions/r2-get-url/index.ts 의 hmacHex/buildWorkerUrl 로직을
//     Deno → Cloudflare Workers 런타임으로 그대로 포팅(둘 다 crypto.subtle 동일).

const DEFAULT_HOST = 'parkinon-media-proxy.dailyhotcoolmeme.workers.dev';

const ENC = new TextEncoder();

/** HMAC-SHA256(secret, message) → 소문자 hex. */
async function hmacHex(secret: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    ENC.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, ENC.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface R2ProxyEnv {
  R2_PROXY_SECRET?: string;
  R2_PROXY_HOST?: string;
}

/**
 * R2 key 를 워커 프록시 토큰 URL 로 변환.
 * 반환: https://<host>/<encoded key>?token=<hex>&exp=<now+3600>
 * 주의: R2_PROXY_SECRET 미설정 시 빈 문자열 반환(호출부에서 graceful 처리).
 */
export async function signMediaUrl(env: R2ProxyEnv, key: string): Promise<string> {
  const secret = env.R2_PROXY_SECRET ?? '';
  if (!secret || !key) return '';
  const host = (env.R2_PROXY_HOST || DEFAULT_HOST)
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  const exp = Math.floor(Date.now() / 1000) + 3600; // 1시간
  const token = await hmacHex(secret, `${key}\n${exp}`);
  // key 의 슬래시는 path 구분자로 유지, 각 세그먼트만 인코딩.
  const encodedPath = key.split('/').map((seg) => encodeURIComponent(seg)).join('/');
  return `https://${host}/${encodedPath}?token=${token}&exp=${exp}`;
}
