/*
 * 루트(`/`) — 방문자를 자기 언어판으로 바로 보낸다. (오너 지시 2026-09-01:
 * "언어 선택이 나오는데 이거 꼭 필요한건가? 바로 각 접속국가 언어에 맞춰서 나오게 하면 안되나?")
 *
 * 그전까지는 `src/pages/index.astro` 의 언어 선택 대문이 떴다. 대문 자체는 그대로 남겨 둔다 —
 * 아래 조건에 다 걸리지 않을 때(=봇, 혹은 자동 판별을 끄고 들어온 경우)의 착륙 지점이자,
 * `?lang=choose` 로 언제든 다시 볼 수 있는 화면이다.
 *
 * ── 판단 순서 (앞에서 정해지면 뒤는 안 본다)
 *   1) `?lang=choose`      → 자동 전환하지 않고 대문을 보여준다(전환 UI 에서 오는 길)
 *   2) 쿠키 `pon_lang`     → **사람이 직접 고른 언어.** 무엇보다 우선한다.
 *   3) Accept-Language     → 브라우저 언어. 접속 국가보다 정확하다 —
 *                            일본 출장 중인 한국분에게 일본어를 주면 안 된다.
 *   4) 접속 국가(CF-IPCountry) → **언어 신호가 아예 없을 때만.** 브라우저가 언어를 말했는데
 *                            우리가 가진 언어가 아니면(예: de-DE) 국가를 보지 않고 바로 5)로 간다.
 *   5) 그래도 모르면        → **영어**(오너 결정 2026-09-01)
 *
 * ── 왜 302 인가
 * 301(영구)로 보내면 브라우저가 캐시해서, 나중에 이 규칙을 바꿔도 이미 방문한 사람에게는
 * 계속 옛 언어로 가버린다. 언어 판별은 사람마다·때마다 달라지는 값이라 영구가 아니다.
 *
 * ── 검색엔진
 * 각 언어판은 사이트맵과 hreflang(`lib/i18nLinks.ts`)으로 따로 알려지고 있으므로, 루트
 * 하나를 302 로 넘겨도 다른 언어판이 색인에서 빠지지 않는다. 다만 크롤러는 Accept-Language 를
 * 잘 안 보내서 대개 5)번 영어로 떨어지는데, 그것이 x-default 와도 어긋나지 않는다.
 */

/*
 * ⚠️ **글이 실제로 있는 언어만** 넣는다. 골격(라우트·사전)만 있고 글이 0편인 언어를 여기
 * 넣으면, 그 언어권 방문자를 **빈 사이트**로 보내게 된다 — 2026-09-02 에 포르투갈어에서
 * 실제로 그랬다(브라질 접속 → 글 0편인 /pt/). 영어로 보내는 편이 낫다.
 *
 * 이 목록은 사이트의 콘텐츠와 어긋나면 안 된다 —
 * `site/scripts/check-root-function-locales.mjs` 가 빌드 때 대조한다.
 * 포르투갈어는 생활 요령 번역이 들어가는 순간 여기에 'pt' 를 추가하면 된다.
 */
const SUPPORTED = ['ko', 'en', 'ja', 'fr', 'es'] as const;
type Lang = (typeof SUPPORTED)[number];
const FALLBACK: Lang = 'en';

/** 그 나라에서 주로 쓰는 언어. 여기 없는 나라는 5)번 폴백으로 간다. */
const COUNTRY_TO_LANG: Record<string, Lang> = {
  KR: 'ko',
  JP: 'ja',
  // 프랑스어권
  FR: 'fr',
  BE: 'fr',
  CH: 'fr',
  CA: 'fr', // 퀘벡. 영어권 캐나다는 Accept-Language 로 대부분 먼저 걸린다.
  MC: 'fr',
  LU: 'fr',
  // 포르투갈어권 — 글이 아직 없어서 뺐다. pt 콘텐츠가 들어가면 BR/PT/AO/MZ 를 되살린다.
  // 스페인어권 — 중남미가 대상이다(스페인은 EEA)
  MX: 'es',
  AR: 'es',
  CO: 'es',
  CL: 'es',
  PE: 'es',
  VE: 'es',
  EC: 'es',
  GT: 'es',
  CU: 'es',
  BO: 'es',
  DO: 'es',
  HN: 'es',
  PY: 'es',
  SV: 'es',
  NI: 'es',
  CR: 'es',
  PA: 'es',
  UY: 'es',
  ES: 'es',
};

function isLang(v: string): v is Lang {
  return (SUPPORTED as readonly string[]).includes(v);
}

/**
 * `Accept-Language: ko-KR,ko;q=0.9,en;q=0.8` 같은 값에서 우리가 가진 언어 중
 * **q 값이 가장 높은 것**을 고른다. 앞에서부터 아무거나 집으면 `de,ko;q=0.9` 같은 경우에
 * 잘못 고를 수 있어서 실제로 q 를 비교한다.
 */
function fromAcceptLanguage(header: string | null): Lang | null {
  if (!header) return null;
  let best: { lang: Lang; q: number } | null = null;
  for (const part of header.split(',')) {
    const [tagRaw, ...params] = part.trim().split(';');
    const base = tagRaw.trim().toLowerCase().split('-')[0];
    if (!isLang(base)) continue;
    const qParam = params.find((p) => p.trim().startsWith('q='));
    const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
    if (Number.isNaN(q)) continue;
    if (!best || q > best.q) best = { lang: base, q };
  }
  return best?.lang ?? null;
}

function fromCookie(header: string | null): Lang | null {
  if (!header) return null;
  for (const c of header.split(';')) {
    const [k, ...v] = c.trim().split('=');
    if (k === 'pon_lang') {
      const val = v.join('=').trim();
      return isLang(val) ? val : null;
    }
  }
  return null;
}

export const onRequestGet: PagesFunction = async (context) => {
  const { request, next } = context;
  const url = new URL(request.url);

  // 1) 대문을 일부러 보러 온 경우 — 자동 전환하지 않는다.
  if (url.searchParams.get('lang') === 'choose') return next();

  const headers = request.headers;
  const accept = headers.get('accept-language');
  const byCountry = () => COUNTRY_TO_LANG[(headers.get('cf-ipcountry') ?? '').toUpperCase()] ?? FALLBACK;

  const chosen =
    // 2) 사람이 직접 고른 언어
    fromCookie(headers.get('cookie')) ??
    // 3) 브라우저 언어
    fromAcceptLanguage(accept) ??
    /*
     * 브라우저가 **언어를 말했는데 우리가 가진 언어가 아닌 경우**(예: de-DE) 는
     * 접속 국가를 보지 않고 바로 영어로 간다. 독일어 브라우저로 한국에서 들어온 사람에게
     * 한국어를 주는 것보다 영어를 주는 편이 읽힌다 — 이미 "나는 독일어를 쓴다"고 말한
     * 사람에게 위치를 근거로 한국어를 들이밀 이유가 없다.
     * 4)번 접속 국가는 **언어 신호가 아예 없을 때**(크롤러·일부 앱 내장 브라우저)만 쓴다.
     */
    (accept && accept.trim() ? FALLBACK : byCountry());

  return new Response(null, {
    status: 302,
    headers: {
      Location: `/${chosen}/`,
      /*
       * 같은 주소인데 사람마다 다른 곳으로 보내므로 **캐시가 사람을 섞어버리면 안 된다.**
       * Vary 로 판단에 쓴 헤더를 알리고, 중간 캐시가 이 응답을 재사용하지 못하게 막는다.
       */
      Vary: 'Accept-Language, Cookie, CF-IPCountry',
      'Cache-Control': 'no-store',
    },
  });
};
