# 반복 운영 업무 — 새 에이전트(코덱스 등)는 여기부터

> 이 문서 하나로 **"뭘 해야 하는지"** 를 알 수 있게 만든 것이다. 각 항목의 자세한 규칙·사고
> 이력은 링크된 문서에 있다 — 거기 안 읽고 하다가 오너에게 여러 번 크게 지적받은 이력이
> 있으니(아래 각주 참고) **반드시 링크 문서를 먼저 읽고 시작할 것.**
>
> 작성 2026-09-07. 클로드 코드에서 코덱스로 전환하며 인계용으로 정리함.

---

## 0. 지금(2026-09-07) 뭐가 밀려 있나 — 세션 열자마자 확인할 것

**소식 발행이 6일째 멈춰 있다.** 마지막 발행 `파킨온 소식 #9`(2026-09-01) 이후 새 글이
없다. "이틀에 1개" 리듬 기준 지금쯤 #12 근처여야 한다. **가장 먼저 할 일은 §1 소식 발행
사이클을 최소 1회(가능하면 밀린 만큼) 돌리는 것이다.**

네이버 카페는 소식 #9(카페 #4, 48949)까지 이미 올라가 있어 밀린 게 없다 — 새 소식이 나오면
그걸 그대로 옮기면 된다(§2).

번역 대기 GitHub 이슈는 전부 처리·종료함(#1·#2·#3, 2026-09-07). 열려 있는 게 있으면 §3 확인.

---

## 1. 소식(뉴스) 발행 — 이틀에 1개 리듬

**목적·형식 정본**: [`website-plan.md`](./website-plan.md) "글 형식(소식 메뉴용)" 절 —
**절대 먼저 읽을 것.** 형식(소제목 이모지 고정 순서 🔍✅🙋, 인용 박스, 면책 문구 등)을
안 지키고 새로 지어내면 오너가 크게 지적한다.

### 1-1. 다음 글 번호·소재 확인

```bash
ls site/src/content/articles/ko/news/          # 기존 글 목록
grep -h '^tag:' site/src/content/articles/ko/news/*.mdx | sort   # 지금까지 나간 번호
```

가장 큰 `#N` 다음 번호를 쓴다. **번호가 절대 빠지면 안 된다** — YAML frontmatter의
`tag: "파킨온 소식 #N"` 은 반드시 큰따옴표로 감쌀 것(안 감싸면 `#N`이 YAML 주석으로 먹혀
번호가 사라지는 사고가 실제로 있었다).

### 1-2. 소재 찾기

**정본**: [`site/docs/news-sourcing.md`](../site/docs/news-sourcing.md) — RSS 우선(한도·차단
없음), firecrawl은 있으면 쓰는 보조 수단일 뿐 필수가 아니다. 우선순위: RSS → 기사 본문
직접 열기 → 리더 프록시(`r.jina.ai`) → Wayback(최후) → firecrawl/WebSearch.

**1호(파일 하나)에 소재 2개 이상을 묶는다.** 소재 하나짜리 단신은 안 쓴다. 1차 출처(PubMed
공식 API, ClinicalTrials.gov API, 규제기관 발표)로 반드시 확인하고, **원문을 못 읽은 소재는
쓰지 않는다.**

```bash
# 최근 논문/기사
curl -sS --compressed -L --max-time 25 -A 'Mozilla/5.0 ...' 'https://parkinsonsnewstoday.com/feed/'
curl -sS --compressed -L --max-time 25 -A 'Mozilla/5.0 ...' 'https://medicalxpress.com/rss-feed/search/?search=parkinson'
curl -s 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=parkinson&retmax=5&sort=date&retmode=json'
```

### 1-3. 글 작성 — 6개 언어 전부

기존 글 9편 전부 ko·en·ja·fr·es·pt 6개 언어가 다 있다 — **한 회차를 6개 파일로 동시에
낸다** (번역을 나중으로 미루지 않는다). 파일 위치:

```
site/src/content/articles/<ko|en|ja|fr|es|pt>/news/<slug>.mdx
```

- 스키마·필수 필드: `title` `description` `tag` `publishedAt` `hero` `heroAlt` `summary`
  (`site/src/content.config.ts` 위반 시 빌드 실패).
- 전용 컴포넌트: `StoryHead`(소재 제목) · `SourceQuote`(원문 인용+링크) · `Callout`(강조 박스).
  기존 글 아무거나 열어서 **구조를 그대로 본뜬다** — 새로 지어내지 말 것.
- 기사 전문 복사·번역 금지. 3~5문장 짧은 발췌 인용만. 기사 사진 금지 — 무료 이미지
  사이트에서 히어로 사진 조달(출처·라이선스 기록).
- 자세한 MDX 함정(줄바꿈 강조 안 먹는 문제, `<b>` 단독 줄 등)은
  [`site-implementation.md`](./site-implementation.md) "글은 마크다운(MDX) 파일이다" 절.

### 1-4. 검사 → 배포 (dev 먼저, 오너 확인 후 prod)

```bash
cd site
npm run build            # guard 스크립트 전부 + astro build. 실패하면 그대로 진행 금지
```

- **dev 미리보기**: `npm run deploy:dev --prefix site` — 검사 통과 후
  `parkinon-site-dev.pages.dev` 에 올리고, **여기 안에 앱 동기화까지 자동으로 붙어 있다**
  (`set-news-app-feature.mjs` + `sync-news-posts.mjs`).
- 오너가 dev 링크를 열어 읽고 **"ok"** 라고 해야 정식(prod) 배포로 넘어간다. 오너가 타이핑할
  일은 "ok" 또는 "여기 고쳐" 뿐이어야 한다(오너 지시 2026-08-06) — 발행 여부 판단을
  대신 내리지 말 것.

- **prod 배포** (승인 받은 뒤):
  ```bash
  cd /Users/ourmine/dev/parkinon-web
  node scripts/merge-deploy.mjs      # merged-dist/ 를 만든다. 이것만으론 배포 안 됨
  wrangler pages deploy /Users/ourmine/dev/parkinon-web/merged-dist \
    --project-name=parkinon-web --branch=main --commit-dirty=true \
    --cwd=/Users/ourmine/dev/parkinon-web/.deploy-staging
  ```
  🚨 **경로는 반드시 절대경로로 줄 것** — `--cwd` 를 상대경로 기준으로 잡으면
  `merged-dist` 를 못 찾아 배포가 실패한다(2026-09-07 실제로 겪음).

  🚨🚨 **`merge-deploy.mjs` 는 앱 동기화를 자동으로 안 한다** (2026-08-14 확인된 뒤로 아직
  안 고쳐짐). **prod 배포 뒤 반드시 수동으로 실행할 것**:
  ```bash
  cd site && npm run sync-news        # posts 테이블에 소식 upsert
  cd site && npm run set-app-feature  # 필요 시 앱 피처 플래그
  ```
  이걸 빠뜨리면 "사이트엔 있는데 앱 커뮤니티엔 안 보인다"는 예전 사고가 재현된다.

- 배포 직후 Cloudflare 엣지 캐시가 옛 응답을 줄 수 있다 — `curl` 로 직접 재확인할 것
  (`?cb=1` 같은 캐시 무력화 쿼리 사용).

### 1-5. 다음 → 네이버 카페에 옮기기

소식이 prod에 올라가면 **곧바로 §2로 넘어간다.** 소식 발행과 카페 게시는 한 세트다.

---

## 2. 네이버 카페 「파킨온 소식」 게시

**정본(반드시 먼저 읽을 것)**: [`naver-cafe-news.md`](./naver-cafe-news.md) — 제목 규칙,
본문 컴포넌트 순서, 사진 규칙, 맨 끝 OG링크 카드 만드는 법(툴바 「링크」 버튼 쓰면 안 됨),
등록 버튼 DOM 매칭까지 전부 있다. **여기 요약은 뼈대만이다 — 실제 작업은 원본 문서를 열어서
그대로 따라갈 것.**

### 빠른 시작

```bash
cd /Users/ourmine/dev/parkinon-web
node scripts/naver-cafe/launch.mjs        # 크롬 띄우기 → 오너가 직접 로그인 (이미 떠 있으면 절대 죽이지 말 것)
node scripts/naver-cafe/list-posts.mjs    # 지금까지 올린 소식 = 다음 카페 번호
node scripts/naver-cafe/dump-post.mjs <직전 글번호>   # 지난 글 형식 그대로 뽑아 대조
```

### 핵심만 요약

| 항목 | 값 |
|---|---|
| 카페 | 파킨슨병 `cafe.naver.com/parkinson777` (clubid 11763699) |
| 게시판 | 자유로운글 (menuid 3) |
| 계정 | 김포사위 — **로그인은 오너가 직접 한다** |
| 브라우저 | CDP 크롬 포트 **9502**, 프로필 `~/Library/Caches/parkinon-naver-profile` |

- 제목: `파킨온 소식 #N. <웹 글 제목 그대로>` — **새로 짓지 말 것.**
- 사진: 웹 글에 이미 있는 본문 중간 사진 1장 재사용 — **새 사진 준비 금지.**
- 🚨 **맨 끝에 반드시 OG링크 카드** (`https://parkinon.com/ko/news/`, `se-l-text` 모양) —
  #4에서 이걸 빠뜨려 오너가 크게 지적한 사고가 있다. 등록 전 마지막으로 이 한 줄부터 확인.
- 🚨 **오너가 "눌러라"라고 하기 전엔 등록 버튼을 누르지 않는다.** 다 쓰면 먼저 보고.
- 등록 버튼은 화면 좌표가 아니라 `innerText.trim() === '등록'` 인 DOM 요소를 찾아 누른다
  (좌표 클릭은 옆의 서체 드롭다운을 잘못 여는 함정이 있다).

---

## 3. 크롤·번역 (자동 알림 → 수동 트리거)

**정본(번역 범위 규칙)**: [`paper-translation-rule.md`](./paper-translation-rule.md) — 🚨
**이 문서를 안 읽고 `paper_translations` 에 아무거나 넣지 말 것.** 과거 "화면에 뜨는 것
전체"로 잘못 짐작해 무관한 논문 29건을 잘못 채웠다가 지운 사고가 있다.

### 흐름

1. `.github/workflows/crawl-content.yml` 이 매일 UTC 18:00(한국 새벽 3시)에 자동으로
   ClinicalTrials.gov·PubMed를 크롤한다.
2. 크롤 뒤 `site/scripts/crawl/report-untranslated.mjs` 가 미번역 항목을 계산해서, 있으면
   **GitHub Issue를 새로 만든다** (`gh issue create`) — 이게 오너에게 메일로 간다
   (owner-owned repo라 이슈 생성 = 자동 이메일 알림, 유료 API·Workers AI 안 씀, 오너가
   명시적으로 이 방식을 선택함).
3. 오너가 메일을 보고 **"번역해"** 라고 말하면 그때 처리한다. 먼저 하지 않는다.

### 번역 규칙 요약 (전체는 위 링크 문서)

| 대상 | 범위 |
|---|---|
| **임상시험**(`clinical_trials` → `trial_translations`) | 전부. 나라 제한 없음. 컬럼은 `title` 하나뿐(요약문 없음) |
| **연구 논문**(`research_papers` → `paper_translations`) | **그 언어를 쓰는 나라에서 나온, `pub_year = 2026`인 것만.** ko↔kr / ja↔jp / fr↔fr / pt↔br / es↔(mx·cl·ar·co·pe, 스페인 본토 제외) |

처리 후 이슈를 닫는다: `gh issue close <번호> --comment "<처리 내용>"`.

Supabase 프로젝트 ID: `avqaflxufyadgzjiojkk` (`mcp__..._Supabase__execute_sql` 로 접근).
🚨 PostgREST는 **한 번에 1000행까지만** 준다 — 직접 select 할 땐 `.range()` 로 끝까지
페이지를 넘길 것(안 그러면 미번역 건수를 잘못 센다, 실제로 겪음).

---

## 4. 광고(Adcash/애드핏) — 손대기 전에 반드시 읽을 것

**정본**: [`ads.md`](./ads.md). 요지만:

- 한국어(`/ko/`)는 카카오 애드핏, 그 외 언어는 Adcash.
- **유럽(EU 27 + EEA·영국·스위스)에는 광고 스크립트 자체를 안 보낸다** — 동의창(CMP)·EU
  대리인이 없어서다. `site/src/lib/ads.ts` 의 `AD_BLOCKED_COUNTRIES`.
- 🚨🚨 **Autotag(`vbzjudlnvz`)는 폐기됐다 — 절대 다시 켜지 마라.** 2026-09-04에 사이트
  전체 클릭이 광고에 먹히는 사고를 냈다. 지금은 전용 Pop-Under 존(`12101602`)만 쓴다
  (`ACS_POPUNDER_ZONE`).
- Pop-Under는 "사이트 아무 데나 클릭하면 뜨는" 광고 포맷이 원래 정의다(Adcash 공식 문서
  확인함) — 버그가 아니다. **오너 결정: 일단 이대로 둔다.** 오너가 먼저 말하기 전엔 설정을
  또 건드리지 말 것.
- parkinon.com 사이트 자체가 Adcash 심사에서 **"Insufficient traffic"으로 반려됐다**
  (2026-09-05). 고치는 버튼이 없다 — 실제 트래픽이 쌓여야 재심사가 가능하다. 배너
  3개(Display) 존은 그대로 붙어 있지만 채워지는 광고가 없어 수익은 사실상 0.

---

## 5. Search Console / robots.txt·sitemap — 건드릴 때 항상 검산

- robots.txt는 `site/src/pages/robots.txt.ts`, sitemap 필터는 `site/astro.config.mjs` 의
  `sitemap({filter: ...})` — **이 둘은 항상 같은 값을 가리켜야 한다.** 한쪽만 막고 한쪽만
  트면 "sitemap엔 있는데 robots.txt가 막고 있다"는 Search Console 오류 메일이 온다(실제로
  2026-08-23·2026-09-06 두 번 겪음).
- 2026-09-07: `/ko/tools/` 차단을 해제했다(색인 허용 — 오너 지시). 헤더·푸터 메뉴
  (`src/lib/nav.ts`)엔 아직 안 걸었다 — 메뉴 노출은 별개 결정이다.
- 로케일(언어)을 새로 막거나 열 때는 **네 곳을 동시에** 고쳐야 한다: `robots.txt.ts` ·
  `astro.config.mjs` sitemap 필터 · `scripts/merge-deploy.mjs` · `scripts/guard-production-locales.mjs`
  의 `BLOCKED_LOCALES`. 검사 스크립트: `site/scripts/check-blocked-locales.mjs`.
- 배포 뒤엔 항상 실제 주소에서 직접 확인한다(빌드 로그만 보고 안심하지 말 것):
  ```bash
  curl -s https://parkinon.com/robots.txt
  curl -s https://parkinon.com/sitemap-0.xml | grep -o 'https://parkinon.com/[^<]*' | head -20
  ```
- Search Console 알림은 Gmail에서 `sc-noreply@google.com` 발신, 계정 `admin@ourmine.co.kr`
  로 온다(Gmail MCP 도구로 조회 가능).

---

## 6. 접속·자격 정보 요약

| 무엇 | 값 |
|---|---|
| 저장소(웹) | `/Users/ourmine/dev/parkinon-web` |
| 저장소(앱, 진짜 프로젝트 지침 정본) | `/Users/ourmine/dev/parkinon-app` |
| Cloudflare Pages(정식) | `parkinon-web` → `parkinon.com` |
| Cloudflare Pages(dev 미리보기) | `parkinon-site-dev` → `parkinon-site-dev.pages.dev` |
| Supabase 프로젝트 | `avqaflxufyadgzjiojkk` |
| GitHub 저장소 | `dailyhotcoolmeme/parkinon-web` (번역 대기 알림 이슈가 여기 생김) |
| 네이버 카페 CDP | 포트 9502, 계정 김포사위, 카페 `parkinson777` |
| Adcash 대시보드 CDP | 포트 9499, `admin@ourmine.co.kr`, Publisher 1208684 |
| 이메일(오너 확인용) | `admin@ourmine.co.kr` — Gmail MCP 도구로 조회 |

---

## 7. 항상 지킬 것 (반복 지적받은 것들)

- **오너가 먼저 승인/지시하지 않은 배포·게시·설정 변경은 하지 않는다.** 특히 네이버 카페
  "등록" 버튼, Adcash 설정, prod 배포는 매번 보고 후 진행.
- **추측을 사실처럼 말하지 않는다.** 확인 안 된 건 "확인 안 됨"이라고 말한다.
- **웹(parkinon-web)과 앱(parkinon-app) 기준을 섞지 않는다** — 유럽 대리인 필요 여부,
  한국 광고 여부가 서로 다르다(CLAUDE.md/AGENTS.md 상단 참고).
- 이 문서에서 다루지 않는 결정·사고 이력은 [`website-plan.md`](./website-plan.md) 와
  [`site-implementation.md`](./site-implementation.md) 에 전부 있다 — 새로 추측하기 전에
  먼저 검색해서 읽을 것.
