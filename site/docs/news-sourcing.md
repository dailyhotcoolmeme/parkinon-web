# 파킨온 소식 — 소재를 어디서 어떻게 가져오는가 (2026-08-13)

소식 글을 쓰는 **모든 작업이 이 문서를 먼저 읽는다.**

만든 이유(오너 지시 2026-08-13): *"파킨온 소식 크롤링 방식도 firecrawl이면.. 막힐 경우
대비해서 다른 방식도 넣자."* 실제로 그날 firecrawl 무료 한도와 WebSearch 세션 한도가
동시에 소진돼, 제도 글 작업이 도중에 조사 수단을 잃을 뻔했다.

---

## 0. 결론부터 — firecrawl 은 필수가 아니다

소식에 필요한 소재는 **RSS 로 전부 들어온다.** 아래는 2026-08-13 실측이다.

| 경로 | 상태 | 비고 |
|---|---|---|
| `parkinsonsnewstoday.com/feed/` | ✅ 200, 10건 | 파킨슨 전문 매체. **주력 1** |
| `medicalxpress.com/rss-feed/search/?search=parkinson` | ✅ 200, 30건 | 검색 기반 RSS. **주력 2** |
| `parkinsons.org.uk/rss.xml` | ✅ 200 | 환자단체 |
| PubMed E-utilities (`esearch.fcgi`) | ✅ 200 | 공식 API. 1차 출처 확인용 |
| ClinicalTrials.gov API v2 | ✅ 200 | 공식 API. 사이트가 이미 쓰고 있다 |

RSS 와 공식 API 는 **봇 차단이 없고 사용량 한도도 없다.** 그냥 `curl` 이면 된다.
firecrawl 은 "있으면 편한 것"이지 없으면 못 하는 것이 아니다.

```bash
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0'
curl -sS --compressed -L --max-time 25 -A "$UA" "https://parkinsonsnewstoday.com/feed/"
curl -sS --compressed -L --max-time 25 -A "$UA" "https://medicalxpress.com/rss-feed/search/?search=parkinson"
```

## 1. 경로 우선순위 — 위에서부터 쓰고, 막히면 내려간다

### ① 소재를 찾을 때 → **RSS** (위 표)

한도도 차단도 없다. 제목·발행일·링크가 그대로 들어 있어 "무엇이 새로 나왔나"를 훑는 데는
이게 가장 빠르고 확실하다.

⚠️ **MedicalXpress 검색 RSS 는 헐겁다.** `search=parkinson` 인데도 파킨슨과 무관한 기사가
섞여 들어온다(실측에서 p53 암 단백질, 소형 현미경 기사가 나왔다). **제목만 보고 고르지 말고
본문을 열어 파킨슨 이야기가 맞는지 확인할 것.**

### ② 개별 기사 본문 → `curl` / WebFetch 직접

RSS 로 고른 기사의 본문을 읽는 단계다. 대개 그냥 열린다.

### ③ 막히면 → **리더 프록시**

```bash
curl -sL --max-time 30 "https://r.jina.ai/https://<원래 URL>"
```

봇을 차단하는 사이트를 실시간으로 뚫는다. **Wayback 과 달리 지금 페이지**라 소식에 적합하다.
⚠️ 렌더링에 실패해 **JS 껍데기만** 돌려주는 경우가 있다. 받은 본문에 실제 내용이 있는지
눈으로 확인하고, 껍데기면 확인 못 한 것으로 취급한다.

### ④ 그래도 막히면 → Wayback

```bash
curl -s "https://archive.org/wayback/available?url=<도메인/경로>&timestamp=<YYYYMMDD>"
curl -sL --compressed -A 'Mozilla/5.0' "https://web.archive.org/web/2026/https://<원래 URL>"
```

⚠️ **소식에서는 거의 쓸모가 없다.** 스냅샷은 과거이고 소식은 최신성이 생명이다.
쓸 자리는 하나뿐이다 — **원문이 사라졌거나 수정된 것을 확인할 때.**
(제도 글은 사정이 다르다. `docs/institutions-brief.md` 2-1 절 참고.)

### ⑤ firecrawl · WebSearch

있으면 쓴다. **없다고 작업을 멈추지 않는다.** 둘 다 한도가 있어 언제든 막힐 수 있으므로,
이 둘에만 의존하는 절차를 만들지 말 것.

## 2. 1차 출처는 매체 기사가 아니다

매체 기사는 **소재를 발견하는 용도**다. 글에 쓰는 근거는 원논문·규제기관 발표로 확인한다
(계획서 "남아 있는 진짜 제약 — 정확도": *1차 출처 없이는 쓰지 않는다*).

```bash
# 논문 — PubMed 공식 API (한도·차단 없음)
curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=parkinson&retmax=5&sort=date&retmode=json"
curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=<PMID>&retmode=xml"

# 임상시험 — ClinicalTrials.gov API v2 (사이트가 이미 쓰는 경로)
curl -s "https://clinicaltrials.gov/api/v2/studies?query.cond=parkinson&pageSize=5"
```

규제기관(FDA·EMA·PMDA)·제약사 보도자료는 개별 URL 을 직접 연다. 2026-08-13 시점에
FDA 보도자료 RSS 경로는 404 였다 — 경로가 확인되면 이 문서에 추가할 것.

## 3. 하지 말아야 할 것

- **읽지 않은 기사를 출처에 넣지 마라.** HTTP 200 은 확인이 아니다 — 200 을 주면서
  "Access Denied" 본문을 내려주는 사이트가 실제로 있다(`ssa.gov`·`medicaid.gov`).
- **RSS 요약문만 보고 쓰지 마라.** 요약은 잘려 있고, 숫자가 본문과 다를 수 있다.
- **AI 를 의학적 근거의 출처로 쓰지 마라.** 계획서에 이미 못 박혀 있다.
- 원문을 못 읽었으면 **그 소재를 쓰지 마라.** 소식은 이틀에 한 번이고 재료는 매일 나온다 —
  확인 안 된 것을 억지로 밀어넣을 이유가 없다.

## 4. 경로가 막히면 이 문서를 고칠 것

접근 경로는 계속 바뀐다(RSS 주소 변경, 봇 차단 강화, API 개편). **막힌 것을 발견하면
그때 우회로를 찾고 이 표를 갱신한다.** 다음 사람이 같은 벽에 다시 부딪히지 않게 하는 것이
이 문서의 목적이다.

확인용 한 줄:

```bash
node site/scripts/check-news-sources.mjs
```
