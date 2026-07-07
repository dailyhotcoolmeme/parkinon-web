// 파킨온 운영자용 신고 검토·조치 관리자 인증 공용 모듈 (Cloudflare Pages Functions)
// 비밀번호 / service_role 키는 전부 서버 환경변수. 프론트엔드 번들엔 절대 노출 없음.
// 마이아멘 목회자용 admin 패턴(functions/_lib/adminAuth.ts)과 동일 구조.

export interface AdminEnv {
  // 운영자 아이디. 미설정 시 아이디 검증 생략(하위호환).
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD: string;
  // ADMIN_TOKEN_SECRET 미설정 시 ADMIN_PASSWORD를 서명 시크릿으로 폴백.
  ADMIN_TOKEN_SECRET?: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  // 신고 목록 게시물 첨부 사진 썸네일용 R2 워커 프록시(미설정 시 썸네일 비표시).
  R2_PROXY_SECRET?: string;
  R2_PROXY_HOST?: string;
}

export interface Ctx {
  request: Request;
  env: AdminEnv;
}

const ENC = new TextEncoder();
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24시간

function tokenSecret(env: AdminEnv): string {
  return env.ADMIN_TOKEN_SECRET || env.ADMIN_PASSWORD || '';
}

async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    ENC.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, ENC.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function checkPassword(env: AdminEnv, password: string): Promise<boolean> {
  // HMAC으로 정규화 후 상수시간 비교 (타이밍 어택 방지)
  const [p, ep] = await Promise.all([
    hmac(tokenSecret(env), 'p:' + password),
    hmac(tokenSecret(env), 'p:' + (env.ADMIN_PASSWORD || '')),
  ]);
  return timingSafeEqual(p, ep);
}

// 아이디 + 비밀번호 동시 검증 (둘 다 상수시간 비교).
// ADMIN_USERNAME 미설정 시 아이디는 통과(비번만 검증) — 하위호환.
export async function checkCredentials(env: AdminEnv, username: string, password: string): Promise<boolean> {
  let userOk = true;
  if (env.ADMIN_USERNAME) {
    const [u, eu] = await Promise.all([
      hmac(tokenSecret(env), 'u:' + username),
      hmac(tokenSecret(env), 'u:' + env.ADMIN_USERNAME),
    ]);
    userOk = timingSafeEqual(u, eu);
  }
  const passOk = await checkPassword(env, password);
  return userOk && passOk;
}

export async function issueToken(env: AdminEnv): Promise<string> {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `admin:${exp}`;
  const signature = await hmac(tokenSecret(env), payload);
  return btoa(JSON.stringify({ payload, signature }));
}

export async function verifyToken(env: AdminEnv, token: string | null): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload, signature } = JSON.parse(atob(token)) as { payload: string; signature: string };
    const parts = String(payload).split(':');
    const exp = parseInt(parts[parts.length - 1], 10);
    if (!exp || Date.now() > exp) return false;
    const expected = await hmac(tokenSecret(env), payload);
    return timingSafeEqual(signature, expected);
  } catch {
    return false;
  }
}

export function bearer(request: Request): string | null {
  const auth = request.headers.get('Authorization') || '';
  const t = auth.replace('Bearer ', '').trim();
  return t || null;
}

// service_role 키로 모더레이션 RPC 호출 (RLS 우회, 서버 전용).
// RPC는 public 스키마이므로 Content-Profile 미지정(기본 public).
export async function callRpc(env: AdminEnv, fn: string, args: Record<string, unknown> = {}) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`rpc ${fn} ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function configError(env: AdminEnv): boolean {
  return !env.ADMIN_PASSWORD || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY;
}

// 보호된 엔드포인트 공통 가드: 설정·인증 통과 시 null, 실패 시 Response 반환.
export async function guard(env: AdminEnv, request: Request): Promise<Response | null> {
  if (configError(env)) return json(503, { error: 'server config error' });
  if (!(await verifyToken(env, bearer(request)))) return json(401, { error: 'unauthorized' });
  return null;
}
