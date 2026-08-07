# parkinon.com 사이트 구현 메모

> **이 문서는 "어떻게 만들어져 있는가"다.** 코드를 만지기 전에 읽는다.
> "무엇을 왜 하는가"(목적·콘텐츠 축·정책·미결)는 짝 문서 [`website-plan.md`](./website-plan.md)에 있다.
> 여기 적힌 것은 대부분 **한 번 틀려서 오너에게 지적받고 고친 것들**이다. 임의로 되돌리지 말 것.

---

## 로컬 개발

```bash
npm run dev --prefix site       # localhost:4321
npm run build --prefix site     # astro check + astro build (0 errors 유지할 것)
```

`.claude/launch.json`(parkinon-app 저장소 쪽에 있음, `site/`가 아니라 **메인 세션 작업 디렉토리
기준**)에 `parkinon-site`(포트 4321) 프리뷰 설정이 이미 있음.

## 배포

**dev 배포만 나갔다. 정식 오픈(루트 도메인 전환)은 아직 안 했다 — 콘텐츠 쌓이면 진행.**

- Cloudflare Pages 프로젝트를 기존 `parkinon-web`(라이브, `parkinon.com`)과 **완전히 분리된 새
  프로젝트** `parkinon-site-dev`로 만들었다. 기존 라이브 사이트의 빌드 설정·라우팅은 건드리지 않았다.
- URL: **https://parkinon-site-dev.pages.dev**
- 재배포: `npm run deploy:dev --prefix site` (astro check → build → wrangler pages deploy)
- ⚠️ **배포 직후 Cloudflare 엣지 캐시가 옛 응답을 잠깐 준다.** `?cb=1` 같은 쿼리를 붙여 확인할 것.
  실제로 이것 때문에 "리다이렉트가 안 걸렸다 / 태그가 안 나간다"고 오해할 뻔했다(2026-08-06, 두 번).
- 관찰(2026-08-06): 이 저장소 `main`에 푸시해도 라이브 `parkinon-web` Pages 프로젝트에 새 빌드가
  생기지 않았다. 최근 배포는 `67a4ab1`이 마지막이고 그 뒤 커밋은 배포 목록에 없다. 푸시 직후
  `parkinon.com`·`/terms` 모두 200. 깃 연동이 꺼진 것인지 단순 스킵인지는 확인하지 않았다 —
  **정식 오픈 전에 대시보드에서 깃 연동 상태를 반드시 확인할 것.**

### 정식 오픈 때 필요한 작업 (아직 안 함)

- **`/about` 은 홈으로 보낸다(302).** QR 코드로 인쇄·배포된 주소라 **주소 자체가 죽으면 안 된다**
  (오너 2026-08-06: "about 주소로 QR 만들어서 배포한 게 있다. 홈화면으로만 보내도 문제없다").
  규칙은 `site/public/_redirects` 에 이미 넣어 뒀고, Astro 사이트가 루트 도메인을 맡는 순간
  자동으로 효력이 생긴다. dev 에서 `/about` `/about/en` `/about/ja` 모두 `/ko/` 로 302 확인.
  - 301 이 아니라 302 인 이유: 브라우저가 301 을 오래 캐시해서 나중에 /about 을 되살려도
    이미 스캔한 사람은 계속 홈으로 간다. QR 은 오프라인 배포라 301 로 얻을 SEO 이득도 없다.
  - ⚠️ **`/about` 은 구글 OAuth 심사를 통과하려고 만든 페이지다.** 우리 설정 기록:
    동의 화면 브랜딩의 홈페이지 = `https://parkinon.com/about`, 개인정보 = `/privacy`, 약관 = `/terms`.
    예전에 구글이 "홈페이지에 로그인이 먼저 뜬다"고 지적했고(루트가 코드입력 SPA), 그래서 정적
    공개 소개 페이지 `/about` 을 만들어 홈페이지 URL 로 지정해 해결했다.
    → 정식 오픈하면 루트가 공개 콘텐츠 홈이 되므로 지적 사유 자체가 사라진다. 그래도 **리다이렉트에
    기대지 말고 동의 화면의 홈페이지 URL 을 새 홈 주소로 바꿀 것**(콘솔에서 직접).
    https://console.cloud.google.com/auth/branding?project=917867748970
    (2026-08-06 현재 값 재확인은 못 함 — 콘솔이 패스키 본인 확인을 요구해서 막혔다.)
  - `/terms` `/privacy` `/delete-account` 는 **리다이렉트 대상이 아니다.** 앱에서 직접 들어오는
    법적 문서라 내용이 그대로 보여야 한다(위 다국어 섹션 참고).

- 기존 React SPA(`/records` 등 내부 라우트)를 `/app` 아래로 옮기고, 이 Astro 빌드를
  `parkinon-web`(루트 도메인) 프로젝트로 전환. 앱 코드에 `parkinon.com/terms`, `/admin` 등
  하드코딩된 링크가 있어 **별도로 신중하게 다시 확인받고 진행할 것.**
- ⚠️ **`PUBLIC_SITE_URL=https://parkinon.com` 으로 빌드해야 색인이 열린다.** 안 그러면
  `noindex` 와 `Disallow: /` 가 그대로 나가 사이트 전체가 검색에 안 잡힌다(아래 SEO 섹션).

---

## 라우트 (10개, 전부 `parkinon-site-dev`에 배포됨)

```
/                                                 → /ko/ 로 302 (site/public/_redirects)
/ko/                                              홈
/ko/institutions                                  제도·지원 허브
/ko/institutions/copayment-reduction-guide        제도·지원 상세(예시 글 1개)
/ko/lifestyle                                     생활 요령 허브
/ko/lifestyle/walking-together-fall-prevention    생활 요령 상세(예시 글 1개)
/ko/news                                          파킨온 소식 허브
/ko/news/exercise-dopamine-neuron-protection      파킨온 소식 상세(예시 글 1개)
/ko/tools                                         도구 허브 — 내비게이션에서 의도적으로 숨김
/ko/tools/medication-schedule                     복약 시간표 도구(실동작) — 마찬가지로 숨김
/ko/privacy                                       웹사이트 개인정보처리방침
```

허브 목록의 나머지 항목(각 10개 안팎)은 아직 실제 글이 없어 `href="#"`다.
**지어내지 말고**, 실제 글이 생기면 그때 slug를 붙여 연결할 것.

---

## 다국어 URL 구조 (확정 2026-08-06 — 나중에 바꾸면 순위를 잃는다)

**모든 언어에 접두사를 붙인다(오너 결정).**

```
/ko/institutions   /en/institutions   /fr/institutions   /ja/institutions
```

루트 `/` 는 `site/public/_redirects` 로 `/ko/` 에 302. 옛 주소(`/institutions` 등)는 301로 새 주소에.

**근거(1차 자료)**

- Google [다지역·다국어 사이트 관리] — 하위 디렉터리(`example.com/de/`)는 "설정 쉽고 유지보수
  부담 적음". URL 파라미터(`?lang=`)는 **권장하지 않음**. **브라우저 언어로 자동 리다이렉트 금지**
  (사용자·검색엔진이 다른 언어판에 접근하지 못한다).
- Google [현지화 버전] — hreflang 은 **상호 링크 필수**("X가 Y를 링크하면 Y도 X를 링크해야 한다.
  아니면 무시될 수 있다"), **자기 자신도 포함**, `x-default` 권장, 절대 URL 필수.
- Astro i18n 문서 — `prefixDefaultLocale: true` 로 전 언어 접두사. **hreflang 은 자동 생성되지
  않는다** → `Layout.astro` 에서 직접 넣는다.

**구현 위치**

- `site/astro.config.mjs` — `i18n: { locales: ['ko','en','fr','ja'], defaultLocale: 'ko',
  routing: { prefixDefaultLocale: true } }`, `site:` 는 `PUBLIC_SITE_URL` 환경변수(기본값 dev 도메인)
- `site/src/layouts/Layout.astro` — `<html lang>`, canonical(절대 URL), hreflang, dev 도메인 noindex
- 링크는 **손으로 적지 말고** `getRelativeLocaleUrl(locale, 'institutions')` 로 만든다
  (Header·Footer·각 페이지 모두 적용됨). 그래야 번역판에서 자동으로 같은 언어로 이어진다.

**번역판을 추가할 때 (지금은 한국어만 있다)**

0. `src/i18n/<언어>.ts` 사전을 만든다 (아래 "번역 누락을 막는 장치" 참고)
1. `src/pages/en/...` 에 같은 구조로 페이지를 만든다
2. 그 페이지들의 `<Layout>` 에 `translations={{ ko: '/ko/...', en: '/en/...' }}` 를 넘긴다
   → 그때부터 양쪽에 hreflang + x-default 가 나간다
3. ⚠️ **실제로 존재하는 언어만 넘길 것.** 없는 번역까지 hreflang 을 걸면 상호 링크가 성립하지 않아
   Google 이 주석 전체를 무시한다. 그래서 지금은 hreflang 이 아예 안 나간다(canonical 만).
4. `@astrojs/sitemap` 의 **i18n 옵션도 그때 켠다**(지금 켜면 없는 `/en/` 주소를 alternate 로 적는다)
5. 언어 전환 UI(푸터 "한국어" 버튼)도 그때 실제 동작을 붙인다 — 지금은 갈 곳이 없어 비활성

**⚠️ `/terms` `/privacy` `/about` `/delete-account` 는 언어 접두사를 붙이지 않는다.**
이 4개는 앱에서 눌러 들어오는 기존 정적 페이지이고 **다른 프로젝트(`parkinon-web` 루트)가
서빙**한다. 앱에 주소가 하드코딩돼 있다. 기존 구조는 `/terms`(한국어)·`/terms/en`·`/terms/fr`·
`/terms/ja` 로 **접두사가 아니라 접미사** 방식이고 hreflang 도 없다. 정식 오픈 때 콘텐츠 사이트와
합치면서 이 4개를 어떻게 할지는 **따로 결정해야 한다**(그대로 두기 / 리다이렉트 걸고 이전).

---

## 대문 (`/`) — 언어를 고르는 첫 화면 (2026-08-07 오너 승인)

예전에는 `/` 가 `_redirects` 로 무조건 `/ko/` 에 갔다. 영어판이 생기면 **미국 사용자가
`parkinon.com` 을 쳐도 한국어 화면을 보게 된다.** 그래서 `/` 를 리다이렉트가 아니라
실제 페이지로 바꿨다 — `src/pages/index.astro` (언어 접두사가 없는 유일한 페이지).

브라우저 언어로 자동 전환하는 방식은 쓰지 않는다. 위 "다국어 URL 구조" 의 Google 근거 참고.

### 언어가 하나뿐이면 대문은 보이지 않는다

버튼이 하나뿐인 문을 지나게 하는 것은 지금보다 나쁘다. 그래서 **빌드마다
`scripts/root-gate.mjs` 가 `dist/` 의 언어 폴더 수를 세어** 자동으로 정한다.

| 언어 수 | `_redirects` | 사이트맵의 `/` |
|---|---|---|
| 1개 | `/ → /ko/ 302` 블록을 넣는다 → 대문이 가려진다 | 뺀다(리다이렉트되는 주소를 올리면 Search Console 이 잡는다) |
| 2개 이상 | 블록을 걷어낸다 → 대문이 드러난다 | 그대로 둔다 |

손으로 넣고 빼면 반드시 잊기 때문에 결과물을 보고 판단하게 했다.
⚠️ 그래서 **루트 규칙을 `public/_redirects` 에 직접 적지 말 것.**

⚠️ 블록은 `# [root-gate:start]` ~ `# [root-gate:end]` 로 감싼다. 처음에는 표시를 한 줄에만
달았더니 언어가 늘어도 **규칙 줄이 남아 대문이 계속 가려졌다** — 일부러 언어를 늘려 시험해서 잡았다.

### 언어 목록 = `src/lib/gate.ts`

번역이 끝난 언어를 한 줄씩 더한다. 없는 언어를 적으면 404 로 이어지니 **페이지가 실제로 생긴 뒤에** 넣는다.

```ts
{ code: 'fr', name: 'Français', tagline: '...', href: '/fr/' },
```

`name` 과 `tagline` 은 **그 언어로** 적는다. 대문에서 문구를 한 언어로만 쓰면 다른 언어
사용자에게는 여전히 남의 집 문이다. 이 파일은 사전을 거치지 않는다(`i18n-exempt` 구역) —
사전을 타면 영어로 폴백될 수 있고, 그러면 한국어 줄이 영어로 바뀌어 고를 수가 없다.

### 개수에 따라 모양이 바뀐다

`GATE_LANGUAGES.length >= 5` 면 한 줄 설명을 빼고 격자로 바꾼다(오너 결정 2026-08-07).

실측 근거: 계획된 8개 언어를 다 넣고 390x844 에서 재니 설명이 있으면 문서 높이가 **945px 로
스크롤이 생겼다.** 대문에서 스크롤이 생기면 아래쪽 언어는 보이지도 않는다.
설명을 빼면 844px 로 들어간다. 설명을 빼도 되는 이유는 **언어 이름 자체가 그 언어로 적혀 있어서**다.

설명을 뺀 상태에서 8개 언어 실측 — 어느 크기에서도 스크롤 없음:

| 1440 | 430x932 | 390x844 | 375x667 | 320x568 |
|---|---|---|---|---|
| 한 줄 4개 | 2개 | 2개 | 2개 | 2개 |

### 로고는 영문 가로형

`logo-mark-white.png` + `logo-text-white.png` (앱 저장소의 `parkinon-symbol-en.png` /
`parkinon-text-en.png` 원본 그대로). **한글 '파킨온' 을 쓰지 않는다** — 언어를 고르기 전
화면이라 어느 한 언어로 쓰면 안 되는 자리다(오너 지시 2026-08-07).

녹색 워드마크 이미지는 존재하지 않는다. 녹색으로 하려면 흰 PNG 에 색을 입혀야 하는데
그건 브랜드 원본이 아니다 — 그래서 흰색 원본을 그대로 쓰는 쪽으로 정했다.

---

## 번역 누락을 막는 장치 (2026-08-07)

오너 지적에서 나온 것이다 — **"폴백이 발생한다면? 한국어가 나오면 안 되잖아."**
예전 구조는 `LABEL[locale] ?? LABEL.ko` 였다. 프랑스 사용자가 한국어 메뉴를 보고도
에러 하나 안 났다. 아래는 그걸 막는 네 겹이다.

### 1) 폴백은 **영어**로 간다. 한국어로는 절대 안 내려간다

```
요청 언어 → 없으면 영어      (한국어는 폴백 대상이 아니다)
```

- `src/i18n/en.ts` 가 **기준 사전**이다. 이 파일의 키 목록이 곧 타입(`Dict`)이 된다.
- `src/i18n/<언어>.ts` 는 `const x: Dict = {...}` 로 선언한다 →
  **키가 하나라도 빠지면 `astro check` 가 실패하고 배포가 막힌다.** (일부러 빼서 확인함)
- 폴백이 실제로 일어나면 `[i18n] 번역 없음 → 영어로 대체: fr "nav.clinical"` 을 빌드 로그에 찍는다.
  같은 (언어, 키) 조합은 한 번만. 조용히 넘어가지 않게 하려는 것이다.

### 2) 폴백된 문구에는 `lang="en"` 이 붙는다

`<Tr k="footer.support" />` 를 쓰면 폴백일 때만 `<span lang="en">` 로 감싼다.
페이지는 `lang="fr"` 인데 안의 한 덩어리만 영어인 상태를 검색엔진·화면낭독기에 정확히 알린다.

| 쓰는 곳 | 쓰는 것 |
|---|---|
| 본문에 찍는 텍스트 | `<Tr k="..." />` |
| 속성값(placeholder·aria-label·alt) | `t(locale, '...')` |
| 값이 끼어드는 문구 | `tv(locale, 'side.moreIn', { category })` — 문자열을 코드에서 이어붙이지 말 것 |

### 3) 공용 코드에 한글이 박히면 빌드가 실패한다

`scripts/check-i18n.mjs` 가 `src/components` · `src/layouts` · `src/lib` 를 훑는다.
주석과 `<style>` 블록은 걸러내므로 한글 주석은 마음껏 써도 된다.

- 이 그물로 실제로 `Layout.astro` 의 `og:site_name`·JSON-LD `name`·기본 description 이
  한국어로 박혀 있던 것을 잡았다. 사람 눈으로는 놓쳤던 것들이다.
- 정말 번역 대상이 아니면 `i18n-exempt:start` / `i18n-exempt:end` 로 감싸고 **이유를 적는다**
  (푸터의 사업자 등록 정보가 그 예).
- `src/pages/ko/**` 와 `src/content/**` 는 애초에 한국어판 전용이라 검사하지 않는다.

같은 스크립트가 **페이지는 있는데 사전이 없는 언어**도 잡아 빌드를 실패시킨다
(`dist/<언어>/` 는 있는데 `src/i18n/<언어>.ts` 가 없는 경우 = 그 언어판 전체가 영어로 폴백).

### 4) 글은 폴백하지 않는다 — 대신 현황을 표로 낸다

글까지 영어로 대체하면 언어가 섞인 페이지가 되고 hreflang 도 깨진다. 그래서 **없는 글은 없는 것으로 둔다.**

글 경로에 언어가 들어간다:

```
src/content/articles/<언어>/<카테고리>/<파일>.mdx
  → entry.id = "ko/institutions/copayment-reduction-guide"
```

`src/lib/articles.ts` 의 `localeOf` / `categoryOf` / `slugOf` / `inCategory(locale, cat)` /
`inLocale(locale)` 로 다룬다. 라우트에서 `id.startsWith('institutions/')` 같은 문자열을 직접 쓰지 말 것.

빌드 끝에 번역 현황이 찍힌다. **여기서는 빌드를 실패시키지 않는다** — 번역은 점진적으로 하는
일이라 막아 세우면 아무 일도 못 한다.

```
번역 현황 (한국어 기준)
  ko: 3편
  en: 1편  빠진 글 2편
      ⬜ institutions/copayment-reduction-guide
```

### 5) 가짜 언어로 미리 깨보기

```bash
npm run check:pseudo --prefix site     # PSEUDO_I18N=1 로 빌드
```

모든 문구를 `[원문·····]` 처럼 1.4배로 늘려 빌드한다. **번역하기 전에** 레이아웃이 어디서 터지는지
보인다. 2026-08-07 실행 결과: 1440~390px 전 구간에서 가로 스크롤·삐져나옴 없음.

### 메뉴 줄바꿈 — 고정 중단점을 버린 이유

CDP 로 6개 메뉴의 필요 폭을 실측했다(2026-08-07).

| 한국어 | 일본어 | 영어 | 독일어 | 프랑스어 |
|---|---|---|---|---|
| 449px | 520px | 648px | 749px | 762px |

`@media (max-width: 860px)` 하나로 판단하면 독일어·프랑스어는 **1024px 데스크톱에서도 메뉴가
두 줄로 접힌다**. 그래서 두 가지를 했다.

- `.nav-links a { white-space: nowrap }` — 메뉴는 절대 줄바꿈되지 않는다
- 헤더의 `is:inline` 스크립트가 **폭이 실제로 모자랄 때** `.compact` 를 붙인다.
  `860px 이하는 무조건` 이라는 하한선은 유지한다(손가락으로 누르는 화면).

실측한 전환 지점: 한국어 860px · 영어 950px · 독일어·프랑스어 1100px. 줄바꿈은 전 구간에서 없음.

⚠️ 브라우저에서 메뉴를 흉내 내 측정할 때는 **기존 `<a>` 를 복제**할 것.
`innerHTML` 로 새로 만들면 Astro 스코프 속성이 없어 `nowrap` 이 안 걸리고, 그래서
"줄바꿈이 여전히 난다"는 잘못된 결론이 나온다(실제로 한 번 그랬다).

### 허브 히어로 보조문구 — 전역 카피와 나라별 콘텐츠를 구분할 것

운동 영상 허브를 만들면서 히어로 소제목에 "질병관리청 국립보건연구원과
대한파킨슨병및이상운동질환학회가 함께 만든, 효과가 확인된 운동입니다"를 그대로 썼다가
오너에게 크게 지적받았다(2026-08-07): "히어로 문구!! 이것도 매번 각 나라마다 맞출거냐고!!"

같은 페이지 안에도 **성격이 다른 텍스트 두 종류**가 있다.

| | 예 | 언어 늘릴 때 |
|---|---|---|
| **나라별 콘텐츠** | 영상 목록(`exerciseVideos.ko.ts`), 출처 인용(`exerciseSource.ko.ts`) | **다시 만든다** — 그 나라 공식 기관을 새로 찾는다 |
| **전역 UI 카피** | 히어로 소제목, 메뉴 라벨, 버튼 문구 | **번역만 한다** — `src/i18n` 사전에 한 번만 넣는다 |

히어로 보조문구에 기관명·통계·나라별 사실을 넣으면 이 둘이 섞여서, 나라별로 다시 써야
하는 것이 되어 버린다. **허브 히어로 문구는 항상 사전(`src/i18n`)에 넣고, 기관명·검증
얘기는 넣지 않는다.** 그 얘기는 이미 본문(출처 문단)에 있다.

문구 내용에 대한 지적도 있었다: "운동 영상의 출처/검증. 이런게 중요하다고 생각하는
자체가 문제라고! 사용자가 운동 영상을 보는 마음을 이해하라고!" — 히어로는 자격·인증을
증명하는 자리가 아니라 **사용자가 이 페이지에 왜 왔는지(동기부여)를 짧게 말하는 자리**다.
(`exercise.tagline` 키 참고 — 기관명 없이 "몸을 움직이면 마음도 한결 가벼워집니다"류)

---

## SEO 메타·구조화 데이터 (2026-08-06 적용)

전부 `Layout.astro` 한 곳에서 만든다. 페이지는 **재료만 넘긴다**(직접 태그를 쓰지 말 것).

| 항목 | 어디서 | 비고 |
|---|---|---|
| `<html lang>` · canonical(절대 URL) | Layout 자동 | 경로 기준 자동 생성 |
| hreflang · x-default | Layout, `translations` prop | **존재하는 언어만**. 지금은 한국어뿐이라 출력 안 됨 |
| og:type/title/description/url/image/locale, twitter:card | Layout 자동 | `ogType="article"` 은 글 상세만 |
| JSON-LD | Layout이 조립 | 홈=WebSite+Organization, 허브·상세=BreadcrumbList, 글=Article |
| sitemap-index.xml / sitemap-0.xml | `@astrojs/sitemap` | 10개 URL |
| robots.txt | `src/pages/robots.txt.ts` | 빌드 시 생성. dev 는 `Disallow: /` |

**Article 구조화 데이터에 없는 값을 넣지 않았다.** Google Article 문서는 "필수 속성은 없고
해당되는 것만 넣으라"고 한다. 그래서 `dateModified`(수정 이력을 추적하지 않음)와 개인 집필자
이름(의료 콘텐츠라 특히 지어내면 안 됨)은 **빼 놨다**. author·publisher 는 Organization "파킨온".
`datePublished` 는 화면에 표시된 작성일과 같은 날짜다(시각은 모르니 날짜만).

**⚠️ 공유 카드 이미지(og:image)는 임시다.** 권장 크기는 1200x630 인데 가진 사진 중 가장 큰
`hero.jpg` 가 1000x667 이라 업스케일 없이는 안 된다. 억지로 늘리지 않고 **1000x524(1.91:1)** 로
잘라 쓰고 `og:image:width/height` 도 실제 값과 맞춰 놨다. 제대로 된 1200x630 브랜드 카드는
따로 만들어야 한다 — **디자인 승인 필요, 미결**.

**검증 방법(다음에도 이렇게 확인할 것)**

- `PUBLIC_SITE_URL=https://parkinon.com npx astro build --outDir ./dist-prodcheck` 로 프로덕션 모드
  빌드 → robots 가 `Allow: /` + Sitemap 줄, noindex 없음, canonical·sitemap 이 parkinon.com 인지
  확인하고 폴더는 지운다. (실제로 이 방법으로 확인했다.)

---

## 쿠키 동의·CMP

**지금 상태: 쿠키 0개, 분석·광고 스크립트 0개(실측). 동의받을 대상이 아직 없다.**
그래서 동의 배너는 만들지 않았다. 자체 제작 배너는 **Google 인증 CMP 가 아니라서** 나중에
EEA 광고 요건도 못 채운다 — 만들면 두 번 일이다.

**확인한 규정** — [Google: EEA·영국 사용자 동의](https://support.google.com/adsense/answer/13554116)

- EEA·영국(2024-01-16~)·스위스(2024-07-31~) 사용자에게 **맞춤형 광고를 게재하려면 Google 인증
  CMP 필수.** 없으면 비맞춤/제한 광고만 나간다.
- **Google 자체 인증 CMP(CMP ID 300)** 가 있고, **AdSense 콘솔 "개인정보 보호 및 메시지" 탭**에서
  켠다. 우리 코드에 배너를 넣는 방식이 아니다.

**애드센스 승인되면 할 일 (순서대로)**

1. AdSense → 개인정보 보호 및 메시지 → **GDPR 메시지 생성·게시**(Google 인증 CMP 사용)
2. 메시지에 개인정보처리방침 URL 을 `https://parkinon.com/ko/privacy` 로 넣는다
3. 웹 방침(`src/pages/ko/privacy.astro`) **제2조·제4조 갱신** — "쿠키 없음"을 실제 사용 쿠키로,
   위탁 표에 광고 사업자 추가, 시행일 갱신
4. 광고 태그 넣은 뒤 EEA 접속에서 배너가 실제로 뜨는지 확인
5. ⬜ **한국 요구사항은 아직 미확인.** PIPC "온라인 맞춤형 광고 개인정보 처리 안내서" 본문으로
   사전동의 여부·고지 문구·거부 수단을 확인해야 한다. 확인 전에는 국내 기준을 단정하지 말 것.

**웹사이트 개인정보처리방침 = `/ko/privacy` (오너 승인 문구, 2026-08-06 시행)**

- 앱 방침(`/privacy`)과 **별개 문서**다. 앱은 건강정보를 매일 수집하고 웹은 아무것도 안 받는다.
- 회사 정보는 푸터 사업자 정보, 문의 이메일·표기는 앱 방침과 맞췄다. **개인 보호책임자 이름은
  앱 방침에도 없어서 넣지 않았다** — 지어내지 말 것.
- 푸터 라벨: `개인정보처리방침`(웹) / `앱 이용약관` / `앱 개인정보처리방침` 3개로 구분.

---

## 글은 마크다운(MDX) 파일이다 — 2026-08-06 전환 완료

```
site/src/content/articles/<카테고리>/<slug>.mdx   →  /ko/<카테고리>/<slug>
```

- **파일 하나만 만들면** 글 페이지·허브 목록·사이드 "다른 글"·관련 글 카드·사이트맵이 전부 자동으로 채워진다.
  예전에는 세 군데를 손으로 고쳐야 했고 하나만 빠뜨려도 링크가 죽었다.
- 스키마는 `src/content.config.ts`. **어기면 빌드가 실패한다** — 기준일·출처를 빠뜨린 채 배포되는 것을 막는 장치다.
  필수: `title` `description` `tag` `publishedAt` `hero` `heroAlt` `summary`(3줄 요약).
  제도 글은 `basisDate`("2026년 7월 기준")와 `sources`를 반드시 채운다.
- **목차는 본문 `##` 에서 자동 생성**된다(`render(entry).headings`). 목차 배열을 손으로 쓰지 말 것.
- 라우트는 `src/pages/ko/[category]/[slug].astro` 하나. 카테고리 라벨은 `src/lib/articles.ts` 에서만 관리한다.
- 본문에서 쓸 수 있는 블록 컴포넌트(`src/components/article/`):

| 컴포넌트 | 용도 |
|---|---|
| `Steps` | 신청 절차 1-2-3 카드 |
| `Checklist` | 준비 서류 체크리스트(실제 체크 가능) |
| `CompareBar` | 막대 비교 도식(예: 부담률 30~60% vs 10%) |
| `SourceBox` | 출처·기준일·문의 — 라우트가 frontmatter 로 자동 렌더 |
| `AppPromo` | 앱 추천 — **글이 끝난 뒤(출처 박스 다음)**. 오너 지시 |

- 표 안에 항목이 여러 개면 `<ul class="cell-list">` 를 쓴다. `<br>` 나열은 금지 —
  모바일에서 항목 간격과 접힌 줄 간격이 같아져 구분이 안 된다(390px 실측: 둘 다 7px).
- ⚠️ **한국어에서 `**강조**` 뒤에 조사가 붙고 앞이 구두점이면 마크다운이 안 먹는다.**
  예: `**10%**만` → 화면에 별표가 그대로 나간다(오너 발견 2026-08-06). CommonMark 규칙상
  닫는 `**` 앞이 구두점(`%`, `)`, `.`)이고 바로 뒤가 한글이면 강조로 인식하지 않는다.
  그런 자리는 **`<strong>10%</strong>만` 처럼 HTML 로 쓴다.**
  `scripts/check-built-html.mjs` 가 빌드 산출물에서 이런 찌꺼기를 찾아 **빌드를 실패시킨다**
  (`npm run build` · `deploy:dev` 에 물려 있음. 일부러 깨뜨려 작동을 확인했다).
- **본문 강조(`**굵게**`)에는 옅은 초록 배경이 붙는다**(오너 요청 2026-08-06 "눈에 들어오게").
  `box-decoration-break: clone` 을 걸어 줄바꿈으로 잘려도 양끝이 둥글게 유지된다.
- **출처는 박스를 씌우지 않는다** — 바로 아래 앱 추천 박스와 같은 회색 라운드 박스라 어색하다는
  오너 지적(2026-08-06). 얇은 선 하나로만 구분한다.
- **앱 추천 블록의 스토어 버튼은 홈(`index.astro`)의 `.store-badge` 와 같은 모양**이다
  (오너 지시 "홈화면에 있는것처럼"). 안드로이드·애플 두 개.
  주소는 **`src/lib/links.ts` 한 곳에서만** 관리한다(홈·글 하단이 공용). 2026-08-06 연결 완료:
  App Store `apps.apple.com/kr/app/id6773573590`(한국어는 `/kr/`, 그 외는 지역 없는 주소) /
  Play `play.google.com/store/apps/details?id=com.ourmine.parkinon`.
  출처는 앱 저장소가 초대 메시지·`/about` 에서 쓰는 실제 주소이고, 접속해서 앱이 맞는지 확인했다.
- 앱 추천 블록 모바일: 사진 132px 을 글과 나란히 두고 버튼은 아래 한 줄. 사진 한 장을 가운데
  놓으면 좌우가 휑해진다(오너 지적).
- 한국어 제목·문장에는 `word-break: keep-all` — 좁은 폭에서 "앱으/로"처럼 낱말이 잘린다.
- 색 박스 콜아웃(주황 배경 + 굵은 라벨)은 쓰지 않는다 — "딱 봐도 AI가 만든 티"라는 오너 지적(2026-08-06).
  같은 내용은 **표**로 정리한다. 공식 사이트들도 그렇게 한다.
- 허브 목록의 광고는 글 6개마다 한 줄 자동 삽입. 글이 적으면 자연히 안 나온다.
- ⚠️ **가짜 목록 항목을 만들지 말 것.** 예전 허브에는 `href="#"` 인 가짜 글이 12개씩 있었다.
  지금은 실제 파일이 있는 글만 나온다. 목록이 비어 보이면 그건 글이 없다는 사실 그대로다.
- `/ko/preview/article-design` 은 디자인 시안 페이지다(사이트맵·검색 제외). 형식이 확정됐으니
  더 이상 정본이 아니다 — **정본은 실제 글 라우트다.** 시안은 필요 없어지면 지운다.

## 오른쪽 사이드 패널 = `src/components/ArticleSide.astro` (허브·상세·방침 공용)

- 상세는 목차 + "OO 다른 글" 2블록, 허브는 "OO 다른 글" 1블록, 방침은 목차만(`links` 생략 가능).
- 목록은 각 허브 목록에서 현재 글만 뺀 **실제 글 목록**이다. 지어낸 인기글 통계는 쓰지 않는다.
- 목차 링크는 본문 `h2`의 `id`를 가리킨다. 페이지 프론트매터 `toc`의 `id`·`label`이 본문 h2와
  **정확히 일치해야** 한다(한쪽만 고치면 링크가 죽는다). sticky 헤더에 제목이 가리지 않도록
  `.article-body h2{ scroll-margin-top: 88px }`. 부드러운 스크롤은 쓰지 않는다(즉시 이동).
- 폭: **허브와 상세가 같은 그리드를 쓴다** — Layout 전역 `.content-body`
  `grid-template-columns: minmax(0,760px) minmax(300px,1fr)`, `column-gap:44px`.
  본문은 760px까지, 남는 폭은 사이드가 가져간다(1648px 화면에서 사이드 428px) → 오른쪽에 빈
  공간이 안 남으면서 두 페이지의 좌우 폭이 정확히 같다. **1080px 이하에서 사이드를 감춘다**.
  ⚠️ 예전에 허브만 `1fr + 300`, 상세만 `760 + 300` 가운데 정렬이라 허브→상세로 넘어갈 때 좌우가
  64px씩 어긋났다(오너 지적 2026-08-06). **폭 정의를 페이지별로 다시 쓰지 말 것 — `.content-body`
  한 군데만 고친다.** 상세는 `.content-body .detail-body` 두 클래스를 같이 쓰고, `.detail-body` 는
  행 배치(breadcrumb/article/사이드)만 담당한다.
- ⚠️ `@media`의 `display:none`은 반드시 `.article-side{display:flex}` **뒤에** 와야 한다. 앞에 두면
  뒤 규칙에 덮여 사이드가 안 사라진다(실제로 1000px에서 사이드가 남아 본문이 눌렸다 — DOM 실측).
- 패널 제목 ↔ 첫 항목 간격은 **글자 기준 18px**로 맞춰 놨다. 박스 여백이 아니라 글자 시작 위치로
  맞춰야 두 패널이 같아 보인다 → `.toc-list` 6px / `.link-list` 13px.
  ⚠️ 이 margin 은 반드시 `.article-side .toc-list` 처럼 써야 한다. `.toc-list{margin-top:...}` 로
  쓰면 위의 `.article-side ul{margin:0}` (우선순위 0-1-1)에 밀려 **여백이 통째로 죽는다**.
- 현재 섹션 판정은 컴포넌트 안의 스크롤 스크립트가 한다(화면 상단 120px 선을 마지막으로 지나간
  h2). **글 맨 위에서는 첫 항목이 선택 상태다** — 들어오자마자 아무것도 선택 안 된 채로 보이면
  안 된다(오너 지시 2026-08-06). 항상 정확히 1개만 선택된다.

**사이드 패널 디자인은 외부 조사 결과다 (2026-08-06). 임의로 되돌리지 말 것.**

| 근거(1차) | 확인한 내용 | 우리 적용 |
|---|---|---|
| NN/g "Table of Contents: The Ultimate Design Guide" | 우측 레일 목차에 박스/카드를 두르면 광고로 보여 무시된다(right-rail blindness). "simple, non-graphical design" 권장. 레일 목차는 sticky + **현재 섹션 하이라이트 강력 권장**. 링크 문구는 소제목과 정확히 일치시킬 것 | 회색 카드 제거(투명 배경), sticky 유지, 현재 섹션 표시 추가 |
| NHS 디자인시스템 Contents list(사용자 조사) | "The active link formatting helped users know where they were", 현재 항목에 `aria-current` | `aria-current="true"` + 초록 글자·왼쪽 초록 막대 |
| nhs.uk 파킨슨병 페이지 실측 | 목차 항목 19px, 카드 없음 | 목차 16px(본문과 동일. 기존 13.5px는 본문보다 작았다) |
| MDN 실측 | 컨테이너 배경 transparent·border 0, 링크 16px, `aria-current` | 위와 같음 |
| Wikipedia(2023 Vector) 실측 | 사이드 목차 배경 없음, 활성 항목 굵게 | 활성 항목 굵게(700) |

- **회색 카드를 다시 씌우지 말 것.** 바로 옆 `AdBox`가 회색 라운드 박스라, 카드를 씌우면 광고
  자리와 똑같이 보인다(위 right-rail blindness와 정확히 같은 실패).
- 대비 실측(WCAG AA 4.5:1 통과): 라이트 목차 18.9 / 활성 5.13 / 날짜 5.74,
  다크 목차 16.3 / 활성 7.87 / 날짜 8.79.

---

## 디자인 규칙 (반복 지적받은 것들, 꼭 지킬 것)

1. **넓은 PC 화면에서 텍스트를 억지로 여러 줄로 쪼개놓지 말 것.** 한 줄로 붙을 공간이 있으면
   붙여라. (홈 CTA 제목/문단, 푸터 면책문구 전부 이 이유로 다시 고쳤다.)
2. **넓은 화면에서 콘텐츠 폭을 좁게 고정해서 오른쪽에 빈 공간이 남는 걸 방치하지 말 것.**
   `margin:0 auto`로 가운데 밀어넣는 정도로 때우지 마라 — "대충 감췄다"는 지적을 받았다.
   **진짜 콘텐츠로 채우는 걸 먼저 고려할 것**(위 사이드 패널 섹션).
3. **히어로 이미지 규칙이 페이지 종류별로 다르다.**
   - 홈: 화면 전체 폭(full-bleed, `.layout` 바깥, viewport 100%).
   - 허브 페이지: **광고 레일 안쪽 "작업 영역"(`main.col`)에만 걸친다.** `main.col`의 padding을
     negative margin으로 상쇄(`.hub-hero-full{margin:-28px calc(-1 * var(--gutter)) ...}`).
     홈처럼 화면 전체로 뻗으면 안 된다는 걸 오너가 명확히 지적했다.
   - **허브 3개의 히어로 제목은 같은 높이에서 시작해야 한다**(오너 지적 2026-08-06).
     **위쪽 정렬 + 고정 padding-top**(데스크톱 114px / 640px 이하 58px)으로 못박았다. 설명글
     최대폭 640px(실측: 560~719px 구간에서만 세 페이지가 모두 2줄).
   - **히어로 높이도 3개가 같아야 한다.** 설명 영역 높이를 최대값으로 고정 — 데스크톱
     `height:48px`(2줄), 640px 이하 `height:96px`(4줄) + `-webkit-line-clamp`. 히어로는 데스크톱
     240px / 모바일 224px. 실측 확인(320·360·375·390·430·640·700·900·1300·1600px × 허브 3개).
     ⚠️ 설명 문구를 길게 고치면 잘릴 수 있다. 바꿀 때는 위 폭들에서 줄 수를 다시 재고, 넘치면
     문구를 줄이거나 세 페이지의 높이 값을 같이 올릴 것(한 페이지만 올리면 다시 어긋난다).
   - 사진 위에 제목을 **오버레이**(어두운 그라디언트 스크림 + 흰 텍스트). 사진과 텍스트를 좌우로
     나란히 배치하는 방식은 "사진이 제목보다 커 보인다"는 이유로 반려됐다.
4. **데스크톱용 스타일이 모바일 레이아웃에 그대로 딸려오지 않는지 볼 것.** 헤더 메뉴의 현재 항목
   밑줄이 데스크톱용 `::after`(`bottom:-6px`) 그대로라, 모바일 햄버거 메뉴에서 초록 줄이 회색
   구분선보다 4px 아래에 떠 있었다(오너 지적 2026-08-06). 모바일에서는 `::after` 를 끄고
   **행 구분선 자체를 초록으로** 바꿔 위치를 맞춘다.
5. **큰 시각적 변경은 제안 → 승인 → 구현 순서를 반드시 지킬 것.** "제안해달라"는 요청에 바로
   실제 코드/배포로 답하지 마라. 한 번 이걸 어겨서 크게 화를 냈다("바로 하지 말고 나한테 검사
   받고 해"). 다만 사용자가 이미 구체적 방향을 지정했으면 그건 승인된 지시이니 바로 구현해도 된다.
6. **스크린샷 캡처 아티팩트에 속지 말 것.** 이상해 보이면 먼저 `getBoundingClientRect`/`scrollWidth`
   등 DOM 측정으로 실제 상태를 확인하고, "캐시 문제일 것"이라고 둘러대며 넘어가지 말 것 —
   사용자가 그 핑계에 크게 화를 냈다. 진짜 원인을 찾아서 구체적으로 설명할 것.
7. **딱 맞는 사진이 없는 카테고리는 톤이 비슷한 기존 사진으로 대체**하고 그렇게 했다고 밝힐 것 —
   없는 사진을 지어내거나 억지로 끼워맞추지 않는다. (제도·지원 히어로는 family.jpg 재사용,
   파킨온소식은 lab.jpg — 둘 다 이미 있던 사진.)

---

## 임상시험(ClinicalTrials.gov API v2) — 반드시 클라이언트 필터를 거칠 것 (2026-08-08)

⚠️ **API 의 `query.locn`(위치 파라미터)로 국가를 거르지 않는다.** `query.cond`(조건)와
`query.locn`(위치)을 같이 쓰면 결과가 오염된다. 실측(2026-08-08)으로 원인 둘을 확인했다.

1. **"PD" 약어 충돌** — 암 면역치료 임상시험은 키워드에 "PD-1"·"PD-L1"(Programmed cell
   Death, 면역관문억제제 표적)이 잔뜩 들어 있다. `query.cond=Parkinson Disease` 가 이걸
   파킨슨병과 겹쳐 매칭한다. 모집 중 673건 중 **47건(7%)이 이 오염**이었다 — 폐암·자궁내막암·
   유방암·식도암 임상시험이 파킨슨병 목록에 섞여 나왔다.
2. **국가명 표기가 데이터와 다르다** — `query.locn` 은 텍스트 매칭이라 실제 저장된 값과
   똑같이 써야 한다. 한국은 흔히 쓰는 `Korea, Republic of` 가 아니라 **`South Korea`** 로
   저장돼 있다. 이것도 실제 위치 데이터의 `country` 값을 직접 나열해서 확인했다.

**그래서 구현은 이렇게 한다.**

1. `query.cond=Parkinson Disease` 로만, 페이지네이션(`nextPageToken`)으로 **모집 중 전체를 받는다**
   (국가 파라미터를 API 에 안 준다).
2. 받은 각 study 를 **우리 코드에서** 두 번 검사한다.
   - `protocolSection.conditionsModule.conditions` 배열에 `"parkinson"` (대소문자 무시) 이
     실제로 포함되는가 — 없으면 버린다.
   - `protocolSection.contactsLocationsModule.locations[].country` 에 목표 국가가 있는가 —
     이걸로 나라별 목록을 나눈다.
3. 국가명 표기는 API 실제 값 기준으로 쓴다 — 짐작하지 말고 그때그때 실제 응답을 확인할 것
   (미국 `United States`, 한국 `South Korea`, 일본 `Japan`, 독일 `Germany`, 프랑스 `France`).

오염 제거 + 정확한 국가명으로 다시 잰 모집 중 수치는 `website-plan.md` "3. 임상시험" 절에 있다
(처음 실측치는 전부 틀렸었다 — 미국 244→212, 프랑스 57→42, 독일 48→33, 한국 27→10, 일본 17→6).

## 주요 파일

- `site/astro.config.mjs` — i18n·sitemap·site URL
- `site/src/layouts/Layout.astro` — 디자인 토큰(`:root`), 페이지 셸(`.layout`/`.ad-rail`/`main.col`/
  `.content-body`), head 메타 전부(canonical·hreflang·og·JSON-LD·noindex), 자체 호스팅 Pretendard
- `site/src/components/` — `Header.astro`(검색·햄버거 실동작) / `Footer.astro`(사업자정보 토글) /
  `AdBox.astro`(광고 자리) / `ArticleSide.astro`(오른쪽 패널)
- `site/src/pages/robots.txt.ts` — robots 빌드 생성
- `site/public/_redirects` — 루트 → `/ko/`, 옛 주소 → 새 주소
- `site/src/assets/images/` — 로고·hero·path·food·yoga·sleep·family·lab.jpg + `appshots/`(앱스토어
  실제 스크린샷 9장). 각 페이지는 `astro:assets`로 WebP 자동 변환 적용
