# 일본어 번역 배치 작업 지침 (2026-08-13)

일본어판 42편 번역의 **모든 배치가 이 문서를 먼저 읽는다.** 배치마다 판단이 갈리면
같은 사이트 안에서 용어·섹션·구조가 달라진다. 실제로 그런 사고가 한 번 났다
(`ja/lifestyle/glossary.mdx` 의 `section` 이 허브 탭 값과 달라 필터에서 조용히 사라질 뻔했다).

---

## 0. 먼저 읽을 것

1. `docs/ja-style-guide.md` — 문체·용어(**영어판 person-first 규칙을 일본어에 옮기지 말 것**)
2. `docs/glossary-anchor-map.ja.txt` — 용어 앵커 43개. **여기 없는 앵커는 링크하지 않는다**
3. 같은 글의 영어판 `src/content/articles/en/...` — 한국 제도를 어떻게 처리했는지 선례가 있다

## 1. 원본과 대상

- 원본(정본): `src/content/articles/ko/{lifestyle,news}/<slug>.mdx`
- 대상: `src/content/articles/ja/{lifestyle,news}/<slug>.mdx` — **파일명(slug)은 그대로**
- 한국어 원본 파일은 **절대 건드리지 않는다**

## 2. frontmatter

| 필드 | 처리 |
|---|---|
| `title` `description` `summary` | 번역 |
| `tag` | 번역하고 번호는 유지 (`몸에서 일어나는 일 #3` → `体に起こること #3`) |
| `section` | **아래 표 그대로**. 한 글자도 다르면 허브 탭에서 사라진다 |
| `slug` `related` `hero` `thumbnail` `publishDate` | **그대로** |
| `sources` | 한국 정부·건강보험 출처는 **제거**. 국제 출처(Parkinson's Foundation 등)는 유지 |
| `appFeature` | 손대지 않는다 — `npm run set-app-feature` 가 나중에 채운다 |

### section 매핑 (정본 — `src/pages/ja/lifestyle/index.astro` 의 SECTIONS)

| 한국어 | 일본어 |
|---|---|
| 질환 이해 | `病気を知る` |
| 시작하기 | `はじめの一歩` |
| 몸에서 일어나는 일 | `体に起こること` |
| 하루를 보내는 법 | `一日の過ごし方` |
| 사람과 상황 | `人と場面` |

## 3. 본문

- 구조(제목 수준·이모지·순서·`<Term>`·`<Callout>` 등 컴포넌트)를 **그대로 유지**
- `✅ 환자분께` → `✅ 患者さんへ` / `🙋 보호자분께` → `🙋 ご家族へ`
- 문말은 です・ます調

### 링크

- 본문의 `/ko/...` 링크는 **하나도 남기지 않는다** → `/ja/...` 로 바꾼다
- ⚠️ **아직 번역되지 않은 ja 글로 링크하면 404 다.** 대상 파일이
  `src/content/articles/ja/` 에 실제로 있는지 확인하고, 없으면
  용어집 앵커(`/ja/lifestyle/glossary/#<앵커>`)로 대체한다
- 용어집 앵커는 `docs/glossary-anchor-map.ja.txt` 에 있는 것만 쓴다

### 한국 제도가 나오는 대목 — 여기서 사고가 난다

일본어판 독자는 일본 거주자다. 건강보험·장기요양보험·산정특례·주민센터·국민연금은
**번역해서 남기면 거짓 정보가 된다.**

1. 일본 제도로 바꿔 쓸 수 있으면 **공식 출처를 실제로 열어 확인하고** 다시 쓴다
   (`nanbyou.or.jp` 難病医療費助成制度 · 介護保険 · 障害年金 · 障害者手帳)
2. 확인하지 못했으면 **일반적으로 서술**한다 —
   「お住まいの自治体の窓口でご確認ください」
3. **확인 없이 일본 제도·금액·요건을 지어내지 말 것.** 틀리면 독자에게 해가 된다
4. 이미 있는 일본 제도 글로 링크할 수 있다 →
   `/ja/institutions/nanbyou-medical-expense-subsidy/`

## 4. 끝내기 전 자가 점검 (전부 통과해야 보고한다)

⚠️ **`astro build` / `astro sync` 를 실행하지 말 것.** 배치 여러 개가 동시에 돌고 있고
`.astro` 캐시와 `dist/` 를 공유하기 때문에, 동시 빌드는 예전에 유령 YAML 오류를 냈다.
빌드 검증은 모든 배치가 끝난 뒤 오케스트레이터가 한 번에 한다.

소스 레벨에서만 확인한다:

```
cd /Users/ourmine/dev/parkinon-web/site
node scripts/check-en-terms.mjs                      # 금지어·섹션값·한국어 잔여
grep -rn '/ko/' src/content/articles/ja/             # 아무것도 안 나와야 한다
grep -rlP '[가-힣]' src/content/articles/ja/         # 아무것도 안 나와야 한다
git status --short                                   # 담당 파일 외에 변경이 없어야 한다
```

앵커는 **손으로 대조**한다 — 쓴 앵커 전부가 `docs/glossary-anchor-map.ja.txt` 에 있어야 하고,
본문의 `/ja/lifestyle/...` `/ja/news/...` 링크는 대상 `.mdx` 가 실제로 존재해야 한다.

## 5. 보고할 것

- 만든 파일 목록
- **한국 제도를 어떻게 처리했는지 글별로** (제거 / 일본 제도로 대체 + 출처 URL / 일반화)
- 없는 글로 링크가 걸려 앵커로 대체한 곳 (나중에 되돌려야 하므로)
- 자가 점검 출력 그대로
